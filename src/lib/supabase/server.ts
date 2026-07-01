import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para Server Components, Route Handlers y Server Actions.
// Respeta la sesión del usuario (y por lo tanto la RLS).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll llamado desde un Server Component: se ignora.
            // El middleware ya refresca la sesión.
          }
        },
      },
    }
  );
}

// Cliente con service_role: SALTA la RLS. Usar SOLO en el servidor para
// operaciones administrativas controladas (worker de notificaciones, etc.).
export function createAdminClient() {
  const { createClient: createSbClient } = require("@supabase/supabase-js");
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
