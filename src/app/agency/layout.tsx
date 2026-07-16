import { requireAgency } from "@/lib/auth";
import { MentionsBellServer } from "@/components/mentions-bell-server";
import { AgencyMobileNav } from "./mobile-nav";
import { AgencyShell } from "./agency-shell";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAgency();
  const isManager = profile.is_admin || profile.is_pm;

  return (
    <>
      <AgencyMobileNav isManager={isManager} bell={<MentionsBellServer />} />
      <AgencyShell isManager={isManager} bell={<MentionsBellServer />}>
        {children}
      </AgencyShell>
    </>
  );
}
