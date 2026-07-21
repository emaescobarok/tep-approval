import { createClient } from "@/lib/supabase/server";
import { getClientAccounts } from "@/lib/accounts";
import { AccountSwitcher } from "@/components/account-switcher";

// Trae las cuentas del login actual y muestra el selector solo si tiene más de
// una. Se renderiza dentro del Topbar (área de cliente).
export async function AccountSwitcherServer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, accounts] = await Promise.all([
    supabase.from("profiles").select("client_id").eq("id", user.id).maybeSingle(),
    getClientAccounts(supabase, user.id),
  ]);

  if (accounts.length < 2 || !profile?.client_id) return null;

  return <AccountSwitcher accounts={accounts} activeId={profile.client_id} />;
}
