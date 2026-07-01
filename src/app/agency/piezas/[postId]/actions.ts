"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Comentario de la agencia en el hilo de una pieza.
export async function addAgencyComment(postId: string, formData: FormData) {
  const profile = await requireAgency();
  const body = String(formData.get("comment") || "").trim();
  if (!body) return;

  const supabase = await createClient();
  await supabase.from("comments").insert({
    post_id: postId,
    author_id: profile.id,
    author_role: "agency",
    body,
  });
  revalidatePath(`/agency/piezas/${postId}`);
}
