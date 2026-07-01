import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface InviteResult {
  ok: boolean;
  link?: string;
  emailed?: boolean;
  error?: string;
}

// Crea (o reutiliza) un usuario invitado, le asigna su profile y devuelve un
// link de invitación. Si hay RESEND configurado, además manda el email.
// Usa service_role (salta RLS): la autorización se valida en la Server Action
// que la llama (agency_can_access / is_admin).
export async function createInvitedUser(opts: {
  email: string;
  fullName?: string | null;
  role: UserRole;
  clientId?: string | null;
  isAdmin?: boolean;
}): Promise<InviteResult> {
  const { email, fullName = null, role, clientId = null, isAdmin = false } = opts;
  const admin = createAdminClient();

  // Intenta invitar (crea el usuario si no existe). Si el usuario ya existe,
  // cae a un link de tipo 'recovery' que también permite definir la contraseña.
  let linkType: "invite" | "recovery" = "invite";
  let { data, error } = await admin.auth.admin.generateLink({ type: "invite", email });

  if (error || !data?.user) {
    linkType = "recovery";
    ({ data, error } = await admin.auth.admin.generateLink({ type: "recovery", email }));
  }

  if (error || !data?.user) {
    return { ok: false, error: error?.message ?? "No se pudo generar la invitación." };
  }

  // Crea el profile (idempotente ante reintentos).
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
      role,
      client_id: role === "client" ? clientId : null,
      full_name: fullName,
      is_admin: role === "agency" ? isAdmin : false,
    },
    { onConflict: "id" }
  );
  if (profErr) return { ok: false, error: profErr.message };

  // Link propio hacia nuestro callback, que verifica el token_hash con verifyOtp.
  const tokenHash = data.properties?.hashed_token;
  const link = tokenHash
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token_hash=${tokenHash}&type=${linkType}&next=/reset-password`
    : undefined;

  // Envío por email (opcional, vía Resend). No bloquea si falla.
  let emailed = false;
  if (link && process.env.RESEND_API_KEY && process.env.NOTIFICATIONS_FROM_EMAIL) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATIONS_FROM_EMAIL,
          to: email,
          subject:
            role === "agency"
              ? "Te invitaron a tep agency (equipo)"
              : "Te invitaron a revisar tu contenido — tep agency",
          html: `<p>Hola${fullName ? " " + fullName : ""},</p>
                 <p>Te crearon una cuenta en la plataforma de tep agency.</p>
                 <p><a href="${link}">Hacé clic acá para definir tu contraseña y entrar</a></p>`,
        }),
      });
      emailed = res.ok;
    } catch {
      emailed = false;
    }
  }

  return { ok: true, link, emailed };
}
