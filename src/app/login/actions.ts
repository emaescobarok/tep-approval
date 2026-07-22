"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Email o contraseña incorrectos. Si todavía no tenés cuenta, pedile una invitación a la agencia."
      )}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  redirect(profile?.role === "agency" ? "/agency/dashboard" : "/client/calendario");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const supabase = await createClient();
  // Pasa por /auth/callback: ahí se canjea el code por la sesión (server-side,
  // donde vive el code_verifier del PKCE) y recién después va a /reset-password.
  // Mandarlo directo a /reset-password dejaba la página sin sesión de recovery.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });
  redirect("/forgot-password?sent=1");
}
