import { requireProfile } from "@/lib/auth";
import { getMyMentions } from "@/lib/mentions";
import { MentionsBell } from "@/components/mentions-bell";

// Carga las menciones del usuario actual y renderiza la campana.
// hrefBase depende del área (agencia o cliente).
export async function MentionsBellServer() {
  const profile = await requireProfile();
  const { items, unread } = await getMyMentions(profile.id, profile.mentions_seen_at);
  const hrefBase = profile.role === "agency" ? "/agency/piezas/" : "/client/pieza/";
  return <MentionsBell items={items} unread={unread} hrefBase={hrefBase} />;
}
