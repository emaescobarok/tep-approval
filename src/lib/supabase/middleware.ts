import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase en cada request y protege rutas por rol.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/invitacion") ||
    // El worker de notificaciones lo llama pg_cron, que no tiene sesión: se
    // autentica con CRON_SECRET en el propio handler. Sin esto el middleware lo
    // redirige a /login (307) y el handler nunca corre.
    path.startsWith("/api/notifications/dispatch");

  // Sin sesión y ruta protegida -> al login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // La separación cliente/agencia NO se chequea acá a propósito: la hacen los
  // layouts de cada área (requireAgency / requireClient), que envuelven todas
  // sus páginas y redirigen a los mismos destinos. Hacerlo también acá costaba
  // un viaje a `profiles` antes de CADA navegación para repetir un chequeo que
  // igual se hace al renderizar. El aislamiento real vive en la RLS.
  return response;
}
