import Link from "next/link";
import Image from "next/image";
import { requireAgency } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { MentionsBellServer } from "@/components/mentions-bell-server";
import { LayoutDashboard, Inbox, Users, LogOut } from "lucide-react";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAgency();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:z-30 md:flex md:h-screen md:flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="tep agency"
              width={36}
              height={36}
              className="size-9 rounded-lg object-cover"
            />
            <span className="font-semibold">tep agency</span>
          </div>
          <MentionsBellServer />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <NavLink href="/agency/dashboard" icon={<LayoutDashboard className="size-4" />}>
            Dashboard
          </NavLink>
          <NavLink href="/agency/correcciones" icon={<Inbox className="size-4" />}>
            Bandeja de correcciones
          </NavLink>
          {(profile.is_admin || profile.is_pm) && (
            <NavLink href="/agency/equipo" icon={<Users className="size-4" />}>
              Equipo
            </NavLink>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <form action={logout}>
            <Button variant="outline" type="submit" className="w-full justify-start">
              <LogOut className="size-4" /> Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
      <div className="min-h-screen">{children}</div>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
    >
      {icon}
      {children}
    </Link>
  );
}
