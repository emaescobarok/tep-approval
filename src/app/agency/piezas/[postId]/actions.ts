"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { insertCommentWithMentions } from "@/lib/mentions";

// Comentario de la agencia en el hilo de una pieza.
export async function addAgencyComment(postId: string, formData: FormData) {
  const profile = await requireAgency();
  const body = String(formData.get("comment") || "").trim();
  if (!body) return;

  const supabase = await createClient();
  await insertCommentWithMentions(supabase, {
    postId,
    authorId: profile.id,
    authorRole: "agency",
    body,
  });
  revalidatePath(`/agency/piezas/${postId}`);
}

// Borra un comentario. Solo admin: se chequea acá y además en la RLS (0016),
// para que no alcance con pegarle a la action salteando el UI.
export async function deleteComment(
  postId: string,
  commentId: string
): Promise<void> {
  const profile = await requireAgency();
  if (!profile.is_admin) return;

  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath(`/agency/piezas/${postId}`);
}
