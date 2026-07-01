"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { createInvitedUser, type InviteResult } from "@/lib/invites";

// Invita a un estratega (usuario role='agency', NO admin). Solo admin.
export async function inviteStrategist(formData: FormData): Promise<InviteResult> {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  if (!email) return { ok: false, error: "Falta el email." };

  const res = await createInvitedUser({ email, fullName, role: "agency", isAdmin: false });
  if (res.ok) revalidatePath("/agency/equipo");
  return res;
}

// Promueve o quita admin a un miembro de la agencia. Solo admin.
// Protección: no se puede quitar el último admin (evita quedar sin acceso total).
export async function setAdmin(
  agencyId: string,
  makeAdmin: boolean
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  if (!makeAdmin) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "agency")
      .eq("is_admin", true);
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Tiene que quedar al menos un administrador." };
    }
  }

  // Solo aplica a usuarios de agencia
  await admin
    .from("profiles")
    .update({ is_admin: makeAdmin })
    .eq("id", agencyId)
    .eq("role", "agency");
  revalidatePath("/agency/equipo");
  return { ok: true };
}

// Asigna o desasigna un cliente a un estratega. Solo admin.
export async function setAssignment(
  agencyId: string,
  clientId: string,
  assigned: boolean
) {
  await requireAdmin();
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
}
