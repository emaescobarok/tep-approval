"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Marca una corrección como resuelta: la pieza vuelve a 'pendiente'.
// El trigger de la DB encola la notificación al cliente ("hay contenido nuevo para revisar").
export async function markResolved(postId: string) {
  await requireAgency();
  const supabase = await createClient();
  await supabase.from("posts").update({ estado: "pendiente" }).eq("id", postId);
  revalidatePath("/agency/correcciones");
  revalidatePath("/agency/dashboard");
}
