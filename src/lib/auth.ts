import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Super admin: el dueño de la plataforma. No se puede eliminar ni degradar, y
// es el único que puede eliminar miembros del equipo. Configurable por env.
export const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL ?? "emaescobar.rp@gmail.com"
).toLowerCase();

// Email del usuario logueado (o null). El email vive en auth.users, no en profiles.
export async function getAuthEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

export async function isSuperAdmin(): Promise<boolean> {
  return (await getAuthEmail()) === SUPER_ADMIN_EMAIL;
}

// Devuelve el profile del usuario logueado o redirige al login.
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  return profile as Profile;
}

export async function requireAgency(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "agency") redirect("/client/calendario");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAgency();
  if (profile.is_admin) return profile;

  // El super admin SIEMPRE tiene acceso total, aunque su flag quedara en false.
  // Además se auto-repara para que la base quede coherente.
  if (await isSuperAdmin()) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ is_admin: true, is_pm: false })
      .eq("id", profile.id);
    profile.is_admin = true;
    return profile;
  }

  redirect("/agency/dashboard");
}

// ¿El usuario de agencia puede gestionar (admin o Project Manager)?
export function canManage(profile: Pick<Profile, "is_admin" | "is_pm">): boolean {
  return profile.is_admin || profile.is_pm;
}

// Admin o PM: agregar/editar cuentas, invitar personas, asignar clientes.
export async function requireManager(): Promise<Profile> {
  const profile = await requireAgency();
  if (!canManage(profile)) redirect("/agency/dashboard");
  return profile;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireAdmin();
  if (!(await isSuperAdmin())) redirect("/agency/equipo");
  return profile;
}

export async function requireClient(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "client" || !profile.client_id) {
    redirect("/agency/dashboard");
  }
  return profile;
}
