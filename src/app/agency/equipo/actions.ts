"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  requireManager,
  requireSuperAdmin,
  SUPER_ADMIN_EMAIL,
} from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createInvitedUser, type InviteResult } from "@/lib/invites";
import type { AgencyTier } from "@/lib/types";

// Invita a un estratega (usuario role='agency', sin permisos de gestión). Solo admin.
export async function inviteStrategist(formData: FormData): Promise<InviteResult> {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  if (!email) return { ok: false, error: "Falta el email." };

  const res = await createInvitedUser({ email, fullName, role: "agency", isAdmin: false });
  if (res.ok) revalidatePath("/agency/equipo");
  return res;
}

// Invita a un Project Manager (role='agency', is_pm=true). Solo admin.
export async function invitePM(formData: FormData): Promise<InviteResult> {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  if (!email) return { ok: false, error: "Falta el email." };

  const res = await createInvitedUser({ email, fullName, role: "agency", isPm: true });
  if (res.ok) revalidatePath("/agency/equipo");
  return res;
}

// Cambia el nivel de un miembro de la agencia (admin / pm / estratega). Solo admin.
// Protección: no se puede quitar el último admin (evita quedar sin acceso total).
export async function setAgencyRole(
  agencyId: string,
  tier: AgencyTier
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireAdmin();
  const admin = createAdminClient();

  // Nadie puede quitarse su propio admin (evita dejarse afuera sin querer).
  if (agencyId === me.id && tier !== "admin") {
    return { ok: false, error: "No podés cambiar tu propio rol de admin." };
  }

  if (tier !== "admin") {
    // El super admin no se puede degradar.
    const { data: targetUser } = await admin.auth.admin.getUserById(agencyId);
    if (targetUser?.user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return { ok: false, error: "No se puede cambiar el rol del super admin." };
    }
    // ¿El objetivo es admin hoy y sería el último? No permitir degradarlo.
    const { data: target } = await admin
      .from("profiles").select("is_admin").eq("id", agencyId).maybeSingle();
    if (target?.is_admin) {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "agency")
        .eq("is_admin", true);
      if ((count ?? 0) <= 1) {
        return { ok: false, error: "Tiene que quedar al menos un administrador." };
      }
    }
  }

  await admin
    .from("profiles")
    .update({ is_admin: tier === "admin", is_pm: tier === "pm" })
    .eq("id", agencyId)
    .eq("role", "agency");
  revalidatePath("/agency/equipo");
  return { ok: true };
}

// Elimina un miembro del equipo (usuario de agencia). Solo el super admin.
// No se puede eliminar a sí mismo ni al super admin.
export async function deleteAgencyUser(
  agencyId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireSuperAdmin();
  if (agencyId === me.id) {
    return { ok: false, error: "No podés eliminarte a vos mismo." };
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles").select("id, role").eq("id", agencyId).maybeSingle();
  if (!target || target.role !== "agency") {
    return { ok: false, error: "Ese usuario no es del equipo." };
  }

  const { data: targetUser } = await admin.auth.admin.getUserById(agencyId);
  if (targetUser?.user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return { ok: false, error: "No se puede eliminar al super admin." };
  }

  const { error } = await admin.auth.admin.deleteUser(agencyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agency/equipo");
  return { ok: true };
}

// Asigna o desasigna un cliente a un estratega.
// Admin (cualquier cliente) o PM (solo sus cuentas asignadas).
export async function setAssignment(
  agencyId: string,
  clientId: string,
  assigned: boolean
): Promise<{ ok: boolean; error?: string }> {
  await requireManager();
  // Chequeo de acceso: la RLS solo devuelve el cliente si el manager lo puede ver.
  const scoped = await createClient();
  const { data: allowed } = await scoped.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (!allowed) return { ok: false, error: "No tenés acceso a esta cuenta." };

  const admin = createAdminClient();
  if (assigned) {
    await admin.from("client_assignments").upsert(
      { agency_id: agencyId, client_id: clientId },
      { onConflict: "agency_id,client_id" }
    );
  } else {
    await admin
      .from("client_assignments")
      .delete()
      .eq("agency_id", agencyId)
      .eq("client_id", clientId);
  }
  revalidatePath("/agency/equipo");
  revalidatePath(`/agency/clientes/${clientId}`);
  return { ok: true };
}
