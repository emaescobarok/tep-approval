import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClientAccount = { id: string; name: string; logo_url: string | null };

// Cuentas (clients) a las que puede acceder el login actual, por sus membresías.
// El nombre/logo salen de clients (la RLS ya deja leer las cuentas del usuario).
export async function getClientAccounts(
  supabase: SupabaseClient,
  userId: string
): Promise<ClientAccount[]> {
  const { data } = await supabase
    .from("client_members")
    .select("client:clients(id, name, logo_url)")
    .eq("user_id", userId);

  // El embed puede venir como objeto o como array según PostgREST; se normaliza.
  const rows = (data as { client: ClientAccount | ClientAccount[] | null }[] | null) ?? [];
  return rows
    .map((r) => (Array.isArray(r.client) ? r.client[0] : r.client))
    .filter((c): c is ClientAccount => !!c)
    .sort((a, b) => a.name.localeCompare(b.name));
}
