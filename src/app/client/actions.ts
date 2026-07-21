"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Cambia la cuenta ACTIVA del cliente (profiles.client_id). Solo permite cambiar
// a una cuenta de la que el login es miembro; la validación va contra
// client_members con la sesión del propio usuario (la RLS la limita a sus filas).
// El update de profiles va con service_role porque el cliente no tiene policy de
// update sobre su profile (solo lee el suyo).
export async function switchAccount(clientId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("client_members")
    .select("client_id")
    .eq("user_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!member) return; // no es miembro: se ignora en silencio

  const admin = createAdminClient();
  await admin.from("profiles").update({ client_id: clientId }).eq("id", user.id);

  revalidatePath("/client/calendario");
  revalidatePath("/client", "layout");
}
