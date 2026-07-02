import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

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
  if (!profile.is_admin) redirect("/agency/dashboard");
  return profile;
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

export async function requireClient(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "client" || !profile.client_id) {
    redirect("/agency/dashboard");
  }
  return profile;
}
