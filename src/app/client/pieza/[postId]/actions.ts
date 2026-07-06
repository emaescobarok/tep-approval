"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { insertCommentWithMentions } from "@/lib/mentions";

// Cliente aprueba una pieza. La RLS impide tocar piezas de otro cliente.
export async function approvePost(postId: string) {
  await requireClient();
  const supabase = await createClient();
  await supabase.from("posts").update({ estado: "aprobado" }).eq("id", postId);
  revalidatePath(`/client/pieza/${postId}`);
  revalidatePath("/client/calendario");
}

// Cliente pide cambios: agrega comentario y cambia estado a 'cambios_pedidos'.
// El trigger de la base encola la notificación a la agencia.
export async function requestChanges(postId: string, formData: FormData) {
  const profile = await requireClient();
  const body = String(formData.get("comment") || "").trim();
  if (!body) return;

  const supabase = await createClient();
  await insertCommentWithMentions(supabase, {
    postId,
    authorId: profile.id,
    authorRole: "client",
    body,
  });
  await supabase.from("posts").update({ estado: "cambios_pedidos" }).eq("id", postId);

  revalidatePath(`/client/pieza/${postId}`);
  revalidatePath("/client/calendario");
}

// Comentario suelto sin cambiar estado.
export async function addComment(postId: string, formData: FormData) {
  const profile = await requireClient();
  const body = String(formData.get("comment") || "").trim();
  if (!body) return;

  const supabase = await createClient();
  await insertCommentWithMentions(supabase, {
    postId,
    authorId: profile.id,
    authorRole: "client",
    body,
  });
  revalidatePath(`/client/pieza/${postId}`);
}
