import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

// Callback para invitaciones / recovery.
// - Links con token_hash + type (recovery) -> verifyOtp (no depende del dispositivo)
// - Flujo PKCE (?code) -> exchangeCodeForSession
//
// IMPORTANTE: las cookies de sesión se escriben sobre el `response` del redirect,
// no con next/headers. Con next/headers las cookies no se adjuntan a un
// NextResponse.redirect, así que la sesión no llegaba al navegador y la página de
// reset quedaba sin sesión ("el link puede haber expirado").
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/reset-password";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return response;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Enlace inválido o expirado")}`
  );
}
