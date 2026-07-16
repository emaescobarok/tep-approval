import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { TIPO_LABEL, type PostTipo, type UserRole } from "@/lib/types";

export interface Participant {
  id: string;
  label: string;
  role: UserRole;
}

function fallbackLabel(role: UserRole): string {
  return role === "agency" ? "Equipo tep" : "Usuario";
}

function toParticipant(r: { id: string; full_name: string | null }, role: UserRole): Participant {
  const name = r.full_name?.trim();
  return { id: r.id, label: name && name.length ? name : fallbackLabel(role), role };
}

interface PostContext {
  clientId: string | null;
  participants: Participant[];
}

// Contexto de una pieza: de qué cuenta es y quiénes pueden mencionarse en ella
// (todo el equipo de la agencia + los usuarios de la cuenta dueña).
// Usa service_role porque un cliente no puede leer perfiles de otros por RLS.
//
// El client_id sale del mismo viaje que el post (join sobre la FK) en vez de una
// segunda consulta, y los dos grupos de perfiles se piden en paralelo: no
// dependen entre sí.
async function loadPostContext(postId: string): Promise<PostContext> {
  const admin = createAdminClient();

  const { data: post } = await admin
    .from("posts")
    .select("calendar_id, calendars(client_id)")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { clientId: null, participants: [] };

  // PostgREST devuelve la relación to-one como objeto, pero según la versión
  // puede tiparse como array: se contemplan las dos formas.
  const cal = post.calendars as unknown as
    | { client_id: string }
    | { client_id: string }[]
    | null;
  const clientId = (Array.isArray(cal) ? cal[0]?.client_id : cal?.client_id) ?? null;

  type Row = { id: string; full_name: string | null };
  const [agencyRes, clientRes] = await Promise.all([
    admin.from("profiles").select("id, full_name").eq("role", "agency").order("full_name"),
    clientId
      ? admin
          .from("profiles").select("id, full_name")
          .eq("role", "client").eq("client_id", clientId).order("full_name")
      : Promise.resolve({ data: [] as Row[] }),
  ]);

  return {
    clientId,
    participants: [
      ...((agencyRes.data ?? []) as Row[]).map((r) => toParticipant(r, "agency")),
      ...((clientRes.data ?? []) as Row[]).map((r) => toParticipant(r, "client")),
    ],
  };
}

export async function getPostParticipants(postId: string): Promise<Participant[]> {
  return (await loadPostContext(postId)).participants;
}

// Deriva los ids mencionados en el texto según los "@etiqueta" presentes.
// Prioriza etiquetas largas (nombres completos) para no confundir subcadenas.
export function extractMentionIds(body: string, participants: Participant[]): string[] {
  const sorted = [...participants].sort((a, b) => b.label.length - a.label.length);
  const found = new Set<string>();
  let haystack = body;
  for (const p of sorted) {
    const token = "@" + p.label;
    if (haystack.includes(token)) {
      found.add(p.id);
      haystack = haystack.split(token).join(" "); // evita re-match de subcadenas
    }
  }
  return [...found];
}

export function participantLabel(
  participants: Participant[],
  id: string | null,
  role: UserRole
): string {
  return participants.find((p) => p.id === id)?.label ?? fallbackLabel(role);
}

// Inserta el comentario (respetando la RLS del `supabase` que se pasa) con sus
// menciones calculadas, y encola una notificación por cada persona mencionada.
export async function insertCommentWithMentions(
  supabase: SupabaseClient,
  input: { postId: string; authorId: string; authorRole: UserRole; body: string }
): Promise<void> {
  const { postId, authorId, authorRole, body } = input;
  // El client_id de la pieza sale de acá: antes se volvían a consultar el post y
  // su calendario más abajo, repitiendo dos viajes que ya se habían hecho.
  const { clientId: postClientId, participants } = await loadPostContext(postId);
  const mentionIds = extractMentionIds(body, participants);

  await supabase.from("comments").insert({
    post_id: postId,
    author_id: authorId,
    author_role: authorRole,
    body,
    mentions: mentionIds,
  });

  const targets = mentionIds.filter((id) => id !== authorId);
  if (targets.length === 0) return;

  const admin = createAdminClient();
  const authorName = participantLabel(participants, authorId, authorRole);

  // Los emails se piden en paralelo: antes era un getUserById por mención, en
  // serie, así que mencionar a 5 personas encadenaba 5 viajes.
  const rows = (
    await Promise.all(
      targets.map(async (id) => {
        const p = participants.find((x) => x.id === id);
        if (!p) return null;
        const { data: u } = await admin.auth.admin.getUserById(id);
        return {
          type: "mentioned",
          recipient_role: p.role,
          client_id: p.role === "client" ? postClientId : null,
          post_id: postId,
          payload: {
            to_email: u?.user?.email ?? null,
            author_name: authorName,
            preview: body.slice(0, 140),
          },
        };
      })
    )
  ).filter((r) => r !== null);

  if (rows.length) await admin.from("notifications").insert(rows);
}

export interface MentionItem {
  id: string;
  postId: string;
  preview: string;
  author: string;
  context: string; // "Cuenta · Tipo"
  createdAt: string;
}

// Menciones al usuario actual (para el panel in-app). La lista base respeta la
// RLS (createClient); los nombres de autor/cuenta se completan con service_role.
export async function getMyMentions(
  userId: string,
  seenAt: string | null
): Promise<{ items: MentionItem[]; unread: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("comments")
    .select("id, post_id, body, author_id, created_at")
    .contains("mentions", [userId]);
  // Solo las menciones posteriores a la última "limpieza" (mentions_seen_at).
  if (seenAt) query = query.gt("created_at", seenAt);
  const { data: rows } = await query
    .order("created_at", { ascending: false })
    .limit(15);

  const list = (rows ?? []) as {
    id: string;
    post_id: string;
    body: string;
    author_id: string | null;
    created_at: string;
  }[];
  if (list.length === 0) return { items: [], unread: 0 };

  const admin = createAdminClient();

  const authorIds = [...new Set(list.map((r) => r.author_id).filter(Boolean))] as string[];
  const postIds = [...new Set(list.map((r) => r.post_id))];

  // Antes eran 4 consultas en cadena: perfiles -> posts -> calendarios ->
  // clientes. Los nombres de cuenta ahora vienen anidados en la misma consulta
  // de posts (posts -> calendars -> clients), y los perfiles van en paralelo
  // porque no dependen de nada de eso. Esto corre en cada carga de página, que
  // es donde vive la campanita de menciones.
  type ProfRow = { id: string; full_name: string | null };
  type PostRow = {
    id: string;
    tipo: PostTipo;
    calendars: { clients: { name: string } | null } | null;
  };

  const [profsRes, postsRes] = await Promise.all([
    authorIds.length
      ? admin.from("profiles").select("id, full_name").in("id", authorIds)
      : Promise.resolve({ data: [] as ProfRow[] }),
    admin.from("posts").select("id, tipo, calendars(clients(name))").in("id", postIds),
  ]);

  const nameById = new Map(
    ((profsRes.data ?? []) as ProfRow[]).map((p) => [p.id, p.full_name])
  );

  const postCtx = new Map(
    ((postsRes.data ?? []) as unknown as PostRow[]).map((p) => {
      // PostgREST devuelve las relaciones to-one como objeto, pero según la
      // versión pueden tiparse como array: se contemplan las dos formas.
      const cal = Array.isArray(p.calendars) ? p.calendars[0] : p.calendars;
      const cli = Array.isArray(cal?.clients) ? cal?.clients[0] : cal?.clients;
      return [p.id, { tipo: p.tipo, clientName: cli?.name ?? "Cuenta" }];
    })
  );

  const items: MentionItem[] = list.map((r) => {
    const ctx = postCtx.get(r.post_id);
    return {
      id: r.id,
      postId: r.post_id,
      preview: r.body.length > 120 ? r.body.slice(0, 120) + "…" : r.body,
      author: nameById.get(r.author_id ?? "") ?? "Alguien",
      context: ctx ? `${ctx.clientName} · ${TIPO_LABEL[ctx.tipo]}` : "",
      createdAt: r.created_at,
    };
  });

  // La lista ya viene filtrada a lo no leído, así que todo lo mostrado es "unread".
  return { items, unread: items.length };
}
