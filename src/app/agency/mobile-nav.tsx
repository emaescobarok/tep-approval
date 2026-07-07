"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Inbox, Users, LogOut, Menu, X } from "lucide-react";

// Barra superior + menú lateral para móvil (el sidebar de escritorio está oculto).
export function AgencyMobileNav({
  isManager,
  bell,
}: {
  isManager: boolean;
  bell: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="tep agency" width={32} height={32} className="size-8 rounded-lg object-cover" />
          <span className="font-semibold">tep agency</span>
        </div>
        <div className="flex items-center gap-1">
          {bell}
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Menú"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-sidebar-border bg-sidebar shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold">Menú</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-3">
              <MobileLink href="/agency/dashboard" onClick={() => setOpen(false)} icon={<LayoutDashboard className="size-4" />}>
                Dashboard
              </MobileLink>
              <MobileLink href="/agency/correcciones" onClick={() => setOpen(false)} icon={<Inbox className="size-4" />}>
                Bandeja de correcciones
              </MobileLink>
              {isManager && (
                <MobileLink href="/agency/equipo" onClick={() => setOpen(false)} icon={<Users className="size-4" />}>
                  Equipo
                </MobileLink>
              )}
            </nav>
            <div className="border-t border-sidebar-border p-3">
              <form action={logout}>
                <Button variant="outline" type="submit" className="w-full justify-start">
                  <LogOut className="size-4" /> Cerrar sesión
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
    >
      {icon}
      {children}
    </Link>
  );
}
