"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Acepta una invitación: crea la cuenta con la contraseña elegida, arma el
// profile con el rol de la invitación, la marca usada e inicia sesión.
// Solo crea cuentas nuevas: si el email ya tiene cuenta, rechaza (ver abajo).
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

  // Crear la cuenta de acceso.
  //
  // Antes, si createUser fallaba, se asumía "el email ya existía" y se le seteaba
  // la contraseña igual. Eso era escalación de privilegios: un PM puede invitar
  // gente de agencia, así que podía invitar el email del super admin, aceptar él
  // mismo el link y quedarse con la cuenta. Aceptar una invitación nunca puede
  // tocar una cuenta de agencia que ya existe ni cambiarle la contraseña.
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });

  if (created.error || !created.data?.user) {
    const yaExiste =
      created.error?.code === "email_exists" ||
      created.error?.status === 422 ||
      /already|exists|registered/i.test(created.error?.message ?? "");

    // Caso multi-cuenta: el email YA tiene login y la invitación es de cliente.
    // Es el mismo dueño sumando otra cuenta. No se toca la cuenta existente ni su
    // contraseña: se exige la contraseña ACTUAL (signInWithPassword lo prueba) y
    // solo se agrega una membresía a la cuenta invitada. Nunca escala privilegios.
    if (yaExiste && inv.role === "client") {
      return linkExistingClient(inv, email, password);
    }

    return {
      ok: false,
      error: yaExiste
        ? "Ya existe una cuenta con ese email. Entrá con tu contraseña, o usá «Olvidé mi contraseña» si no la recordás."
        : created.error?.message ?? "No se pudo crear la cuenta.",
    };
  }
  const userId = created.data.user.id;

  // Profile con el rol/cuenta de la invitación. El usuario recién se creó, así
  // que es un insert: no hay profile previo que pisar.
  const { error: profErr } = await admin.from("profiles").insert({
    id: userId,
    role: inv.role,
    client_id: inv.role === "client" ? inv.client_id : null,
    full_name: inv.full_name,
    is_admin: inv.role === "agency" ? inv.is_admin : false,
    is_pm: inv.role === "agency" ? inv.is_pm : false,
  });
  if (profErr) {
    // Sin profile la cuenta no sirve, y si la dejamos el email queda ocupado:
    // el reintento chocaría contra el "ya existe" de arriba y la invitación
    // quedaría inutilizable para siempre. Se deshace la cuenta a medio crear.
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: profErr.message };
  }

  // Membresía a la cuenta invitada (fuente de verdad del acceso del cliente).
  if (inv.role === "client" && inv.client_id) {
    await admin
      .from("client_members")
      .upsert({ user_id: userId, client_id: inv.client_id }, { onConflict: "user_id,client_id" });
  }

  await admin.from("invitations").update({ used_at: new Date().toISOString() }).eq("id", inv.id);

  // Inicia sesión y entra al área correspondiente.
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect(inv.role === "agency" ? "/agency/dashboard" : "/client/calendario");
}

// El dueño ya tiene login y suma otra cuenta de cliente. Requiere su contraseña
// ACTUAL (así nadie con el link puede engancharse a una cuenta ajena) y solo
// funciona si el login existente es de cliente. Agrega la membresía, deja esa
// cuenta como activa y marca la invitación usada. No cambia la contraseña ni el
// rol de la cuenta existente.
async function linkExistingClient(
  inv: { id: string; role: string; client_id: string | null },
  email: string,
  password: string
): Promise<{ ok: false; error: string }> {
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr || !signIn.user) {
    return {
      ok: false,
      error: "Ese email ya tiene una cuenta. Ingresá tu contraseña actual para sumar esta cuenta a tu acceso.",
    };
  }

  const userId = signIn.user.id;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || profile.role !== "client") {
    return { ok: false, error: "Ese email pertenece a una cuenta que no es de cliente." };
  }
  if (!inv.client_id) {
    return { ok: false, error: "La invitación no tiene una cuenta asociada." };
  }

  await admin
    .from("client_members")
    .upsert({ user_id: userId, client_id: inv.client_id }, { onConflict: "user_id,client_id" });
  // Deja la cuenta recién sumada como activa, para que aterrice en ella.
  await admin.from("profiles").update({ client_id: inv.client_id }).eq("id", userId);
  await admin.from("invitations").update({ used_at: new Date().toISOString() }).eq("id", inv.id);

  redirect("/client/calendario");
}
