import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface InviteResult {
  ok: boolean;
  link?: string;
  emailed?: boolean;
  expiresInHours?: number;
  error?: string;
}

// Vencimiento del link de invitación (horas). Configurable por env.
export const INVITE_TTL_HOURS = Number(process.env.INVITE_TTL_HOURS) || 24;

// Crea una invitación con token y vencimiento propios, y devuelve el link para
// compartir. La cuenta se crea recién cuando la persona acepta en
// /invitacion/<token>. Usa service_role: la autorización se valida en la action.
export async function createInvitedUser(opts: {
  email: string;
  fullName?: string | null;
  role: UserRole;
  clientId?: string | null;
  isAdmin?: boolean;
  isPm?: boolean;
}): Promise<InviteResult> {
  const { email, fullName = null, role, clientId = null, isAdmin = false, isPm = false } = opts;
  const admin = createAdminClient();

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000).toISOString();

  const { error } = await admin.from("invitations").insert({
    token,
    email: email.toLowerCase(),
    full_name: fullName,
    role,
    client_id: role === "client" ? clientId : null,
    is_admin: role === "agency" ? isAdmin : false,
    is_pm: role === "agency" ? isPm : false,
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: error.message };

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/invitacion/${token}`;
  return { ok: true, link, emailed: false, expiresInHours: INVITE_TTL_HOURS };
}
