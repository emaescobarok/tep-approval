"use server";

import { revalidatePath } from "next/cache";
import { requireAgency, requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createInvitedUser, type InviteResult } from "@/lib/invites";
import {
  TIPOS_CON_COPY_OBLIGATORIO,
  type PostPlataforma,
  type PostTipo,
  type MediaTipo,
} from "@/lib/types";

// Asegura que exista el calendario del mes/año para el cliente y devuelve su id.
async function ensureCalendar(clientId: string, month: number, year: number) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("calendars")
    .select("id")
    .eq("client_id", clientId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("calendars")
    .insert({ client_id: clientId, month, year })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created!.id as string;
}

type MediaInput = { storage_path: string; media_type: MediaTipo };

// Crea una pieza. Los archivos ya fueron subidos a Storage por el cliente-browser;
// acá solo persistimos las filas. La validación de copy también vive en la DB (CHECK).
export async function createPost(input: {
  clientId: string;
  month: number;
  year: number;
  tipo: PostTipo;
  plataforma: PostPlataforma;
  copy: string;
  publishDate?: string | null;
  driveUrl?: string;
  coverPath?: string | null;
  media: MediaInput[];
}) {
  await requireAgency();
  const supabase = await createClient();

  const copyTrim = input.copy.trim();
  if (TIPOS_CON_COPY_OBLIGATORIO.includes(input.tipo) && !copyTrim) {
    return { ok: false, error: "El copy es obligatorio para carrusel y texto." };
  }
  if (!input.publishDate) {
    return { ok: false, error: "Elegí la fecha de publicación." };
  }

  const calendarId = await ensureCalendar(input.clientId, input.month, input.year);

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      calendar_id: calendarId,
      tipo: input.tipo,
      plataforma: input.plataforma,
      copy: copyTrim || null,
      publish_date: input.publishDate,
      drive_url: input.driveUrl?.trim() || null,
      cover_path: input.coverPath || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  if (input.media.length) {
    const rows = input.media.map((m, i) => ({
      post_id: post!.id,
      storage_path: m.storage_path,
      media_type: m.media_type,
      position: i,
    }));
    await supabase.from("post_media").insert(rows);
  }

  revalidatePath(`/agency/clientes/${input.clientId}`);
  return { ok: true };
}

// Edita una pieza existente (solo agencia): copy, fecha, Drive, portada y el
// conjunto/orden de imágenes. El cliente-browser ya subió los archivos nuevos a
// Storage; acá persistimos filas y borramos del Storage lo que se quitó.
export async function updatePost(input: {
  postId: string;
  clientId: string;
  tipo: PostTipo;
  copy: string;
  publishDate?: string | null;
  driveUrl?: string;
  coverPath?: string | null;
  media: MediaInput[];
  removedPaths: string[];
}): Promise<{ ok: boolean; error?: string }> {
  await requireAgency();
  const supabase = await createClient();

  const copyTrim = input.copy.trim();
  if (TIPOS_CON_COPY_OBLIGATORIO.includes(input.tipo) && !copyTrim) {
    return { ok: false, error: "El copy es obligatorio para carrusel y texto." };
  }
  if (!input.publishDate) {
    return { ok: false, error: "Elegí la fecha de publicación." };
  }

  const { error: upErr } = await supabase
    .from("posts")
    .update({
      copy: copyTrim || null,
      publish_date: input.publishDate,
      drive_url: input.driveUrl?.trim() || null,
      cover_path: input.coverPath || null,
    })
    .eq("id", input.postId);
  if (upErr) return { ok: false, error: upErr.message };

  // Borra del Storage los archivos que se quitaron (imágenes o portada vieja).
  if (input.removedPaths.length) {
    await supabase.storage.from("post-media").remove(input.removedPaths);
  }

  // Reescribe las filas de media en el nuevo orden (position 0,1,2...).
  await supabase.from("post_media").delete().eq("post_id", input.postId);
  if (input.media.length) {
    const rows = input.media.map((m, i) => ({
      post_id: input.postId,
      storage_path: m.storage_path,
      media_type: m.media_type,
      position: i,
    }));
    const { error: mErr } = await supabase.from("post_media").insert(rows);
    if (mErr) return { ok: false, error: mErr.message };
  }

  revalidatePath(`/agency/clientes/${input.clientId}`);
  revalidatePath(`/agency/piezas/${input.postId}`);
  return { ok: true };
}

// Guarda la introducción de la planificación del mes (la escribe el estratega).
export async function updateIntro(input: {
  clientId: string;
  month: number;
  year: number;
  intro: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAgency();
  const supabase = await createClient();
  const calendarId = await ensureCalendar(input.clientId, input.month, input.year);
  const { error } = await supabase
    .from("calendars")
    .update({ intro: input.intro.trim() || null })
    .eq("id", calendarId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/agency/clientes/${input.clientId}`);
  return { ok: true };
}

// Borra una publicación (y su media). Autorización por RLS: solo agencia que
// puede acceder al cliente (admin o estratega asignado). Un estratega asignado
// al cliente puede borrar; el admin también.
export async function deletePost(
  postId: string,
  clientId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAgency();
  const supabase = await createClient();

  // Borra los archivos del Storage (la policy de storage valida acceso).
  const { data: media } = await supabase
    .from("post_media").select("storage_path").eq("post_id", postId);
  const paths = (media ?? []).map((m) => m.storage_path);
  if (paths.length) {
    await supabase.storage.from("post-media").remove(paths);
  }

  // Borra la pieza. Si la RLS lo bloquea, no afecta filas.
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/agency/clientes/${clientId}`);
  return { ok: true };
}

// La agencia marca una corrección como resuelta -> vuelve a 'pendiente'.
// El trigger encola la notificación al cliente.
export async function resolveChanges(postId: string, clientId: string) {
  await requireAgency();
  const supabase = await createClient();
  await supabase.from("posts").update({ estado: "pendiente" }).eq("id", postId);
  revalidatePath(`/agency/clientes/${clientId}`);
  revalidatePath("/agency/correcciones");
}

// Invita a un usuario CLIENTE del cliente indicado. Devuelve el link de invitación.
// Solo Admin o Project Manager (dar permisos a personas).
export async function inviteClientUser(
  clientId: string,
  formData: FormData
): Promise<InviteResult> {
  await requireManager();
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  if (!email) return { ok: false, error: "Falta el email." };

  // Chequeo de acceso: si la RLS no devuelve el cliente, no está autorizado.
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (!client) return { ok: false, error: "No tenés acceso a este cliente." };

  const res = await createInvitedUser({ email, fullName, role: "client", clientId });
  if (res.ok) revalidatePath(`/agency/clientes/${clientId}`);
  return res;
}
