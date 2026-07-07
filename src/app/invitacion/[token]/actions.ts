"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Acepta una invitación: crea (o actualiza) la cuenta con la contraseña elegida,
// arma el profile con el rol de la invitación, la marca usada e inicia sesión.
export async function acceptInvitation(
  token: string,
  formData: FormData
): Promise<{ ok: false; error: string }> {
  const password = String(formData.get("password") || "");
  if (password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invitations").select("*").eq("token", token).maybeSingle();

  if (!inv) return { ok: false, error: "Invitación inválida." };
  if (inv.used_at) return { ok: false, error: "Esta invitación ya fue usada." };
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "La invitación expiró. Pedí una nueva." };
  }

  const email = String(inv.email);

  // Crear la cuenta de acceso (o, si el email ya existía, setear su contraseña).
  let userId: string | null = null;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!created.error && created.data?.user) {
    userId = created.data.user.id;
  } else {
    const link = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (link.error || !link.data?.user) {
      return { ok: false, error: created.error?.message ?? "No se pudo crear la cuenta." };
    }
    userId = link.data.user.id;
    await admin.auth.admin.updateUserById(userId, { password });
  }

  // Profile con el rol/cuenta de la invitación.
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: inv.role,
      client_id: inv.role === "client" ? inv.client_id : null,
      full_name: inv.full_name,
      is_admin: inv.role === "agency" ? inv.is_admin : false,
      is_pm: inv.role === "agency" ? inv.is_pm : false,
    },
    { onConflict: "id" }
  );
  if (profErr) return { ok: false, error: profErr.message };

  await admin.from("invitations").update({ used_at: new Date().toISOString() }).eq("id", inv.id);

  // Inicia sesión y entra al área correspondiente.
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect(inv.role === "agency" ? "/agency/dashboard" : "/client/calendario");
}
