import { requireProfile } from "@/lib/auth";
import { getMyMentions } from "@/lib/mentions";
import { MentionsBell } from "@/components/mentions-bell";

// Carga las menciones del usuario actual y renderiza la campana.
// hrefBase depende del área (agencia o cliente).
export async function MentionsBellServer() {
  const profile = await requireProfile();
  const { items, unread } = await getMyMentions(profile.id, profile.mentions_seen_at);
  const isAgency = profile.role === "agency";
  const hrefBase = isAgency ? "/agency/piezas/" : "/client/pieza/";
  // Agencia: campana en el sidebar -> panel acotado, cae sobre el menú.
  // Cliente: campana en el topbar -> panel ancho.
  return (
    <MentionsBell
      items={items}
      unread={unread}
      hrefBase={hrefBase}
      placement={isAgency ? "sidebar" : "topbar"}
    />
  );
}
