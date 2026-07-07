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

// Personas que participan de una pieza y pueden mencionarse entre sí:
// todo el equipo de la agencia + los usuarios de la cuenta dueña de la pieza.
// Usa service_role porque un cliente no puede leer perfiles de otros por RLS.
export async function getPostParticipants(postId: string): Promise<Participant[]> {
  const admin = createAdminClient();

  const { data: post } = await admin
    .from("posts").select("calendar_id").eq("id", postId).maybeSingle();
  if (!post) return [];

  const { data: cal } = await admin
    .from("calendars").select("client_id").eq("id", post.calendar_id).maybeSingle();
  const clientId = cal?.client_id ?? null;

  const { data: agency } = await admin
    .from("profiles").select("id, full_name").eq("role", "agency").order("full_name");

  const { data: clientUsers } = clientId
    ? await admin
        .from("profiles").select("id, full_name")
        .eq("role", "client").eq("client_id", clientId).order("full_name")
    : { data: [] as { id: string; full_name: string | null }[] };

  type Row = { id: string; full_name: string | null };
  return [
    ...((agency ?? []) as Row[]).map((r) => toParticipant(r, "agency")),
    ...((clientUsers ?? []) as Row[]).map((r) => toParticipant(r, "client")),
  ];
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
  const participants = await getPostParticipants(postId);
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

  const { data: post } = await admin
    .from("posts").select("calendar_id").eq("id", postId).maybeSingle();
  const { data: cal } = post
    ? await admin.from("calendars").select("client_id").eq("id", post.calendar_id).maybeSingle()
    : { data: null };
  const postClientId = cal?.client_id ?? null;

  const authorName = participantLabel(participants, authorId, authorRole);

  const rows = [];
  for (const id of targets) {
    const p = participants.find((x) => x.id === id);
    if (!p) continue;
    const { data: u } = await admin.auth.admin.getUserById(id);
    const email = u?.user?.email ?? null;
    rows.push({
      type: "mentioned",
      recipient_role: p.role,
      client_id: p.role === "client" ? postClientId : null,
      post_id: postId,
      payload: {
        to_email: email,
        author_name: authorName,
        preview: body.slice(0, 140),
      },
    });
  }
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
  const { data: rows } = await supabase
    .from("comments")
    .select("id, post_id, body, author_id, created_at")
    .contains("mentions", [userId])
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

  const { data: profs } = authorIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const profList = (profs ?? []) as { id: string; full_name: string | null }[];
  const nameById = new Map(profList.map((p) => [p.id, p.full_name]));

  const { data: posts } = await admin
    .from("posts").select("id, tipo, calendar_id").in("id", postIds);
  const postList = (posts ?? []) as { id: string; tipo: PostTipo; calendar_id: string }[];

  const calIds = [...new Set(postList.map((p) => p.calendar_id))];
  const { data: cals } = await admin
    .from("calendars").select("id, client_id").in("id", calIds);
  const calList = (cals ?? []) as { id: string; client_id: string }[];
  const clientIdByCal = new Map(calList.map((c) => [c.id, c.client_id]));

  const clientIds = [...new Set(calList.map((c) => c.client_id))];
  const { data: clients } = clientIds.length
    ? await admin.from("clients").select("id, name").in("id", clientIds)
    : { data: [] as { id: string; name: string }[] };
  const clientList = (clients ?? []) as { id: string; name: string }[];
  const clientNameById = new Map(clientList.map((c) => [c.id, c.name]));

  const postCtx = new Map(
    postList.map((p) => [
      p.id,
      {
        tipo: p.tipo,
        clientName: clientNameById.get(clientIdByCal.get(p.calendar_id) ?? "") ?? "Cuenta",
      },
    ])
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

  const unread = seenAt
    ? items.filter((i) => i.createdAt > seenAt).length
    : items.length;

  return { items, unread };
}
