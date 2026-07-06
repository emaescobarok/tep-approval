"use client";

import { InviteBox } from "@/components/invite-box";
import { inviteClientUser } from "./actions";

export function InviteForm({ clientId }: { clientId: string }) {
  const action = inviteClientUser.bind(null, clientId);
  return <InviteBox action={action} label="Invitar usuario de la cuenta" />;
}
