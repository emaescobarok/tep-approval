"use server";

import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// Marca las menciones como vistas (actualiza profiles.mentions_seen_at).
// Usa service_role porque un usuario no puede escribir su propio profile por RLS.
export async function markMentionsSeen() {
  const profile = await requireProfile();
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ mentions_seen_at: new Date().toISOString() })
    .eq("id", profile.id);
}
