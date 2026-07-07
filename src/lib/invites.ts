import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface InviteResult {
  ok: boolean;
  link?: string;
  emailed?: boolean;
  error?: string;
}

// Crea (o reutiliza) un usuario invitado, le asigna su profile y hace que
// Supabase le envíe el email para definir su contraseña.
//  - Usuario nuevo  -> inviteUserByEmail (crea + envía invitación).
//  - Usuario existe -> resetPasswordForEmail (envía link para definir clave).
// Si el envío fallara, se devuelve un link de respaldo para compartir a mano.
// Usa service_role (salta RLS): la autorización se valida en la Server Action.
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
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`;

  let userId: string | null = null;
  let emailed = false;

  // 1) Intento de invitación (usuario nuevo): crea el usuario y envía el email.
  const invite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!invite.error && invite.data?.user) {
    userId = invite.data.user.id;
    emailed = true;
  } else {
    // 2) El usuario ya existe: obtenemos su id y le mandamos un link de recovery
    //    (sirve para definir/redefinir la contraseña).
    const link = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (link.error || !link.data?.user) {
      return {
        ok: false,
        error: link.error?.message ?? invite.error?.message ?? "No se pudo invitar.",
      };
    }
    userId = link.data.user.id;
    const reset = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    emailed = !reset.error;
  }

  if (!userId) return { ok: false, error: "No se pudo crear el usuario." };

  // Crea el profile (idempotente ante reintentos).
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      role,
      client_id: role === "client" ? clientId : null,
      full_name: fullName,
      is_admin: role === "agency" ? isAdmin : false,
      is_pm: role === "agency" ? isPm : false,
    },
    { onConflict: "id" }
  );
  if (profErr) return { ok: false, error: profErr.message };

  // Respaldo: si el email no pudo enviarse, devolvemos un link para compartir.
  let link: string | undefined;
  if (!emailed) {
    const gl = await admin.auth.admin.generateLink({ type: "recovery", email });
    const tokenHash = gl.data?.properties?.hashed_token;
    link = tokenHash
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token_hash=${tokenHash}&type=recovery&next=/reset-password`
      : undefined;
  }

  return { ok: true, emailed, link };
}
