"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Inbox,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const STORAGE_KEY = "tep:sidebar-collapsed";

// Shell de la agencia: sidebar colapsable + contenido. Es cliente por el estado
// del colapso; las partes que necesitan server (la campana) entran por prop.
export function AgencyShell({
  isManager,
  bell,
  children,
}: {
  isManager: boolean;
  bell: React.ReactNode;
  children: React.ReactNode;
}) {
  // Arranca expandido siempre y se corrige tras montar: leer localStorage en el
  // primer render rompería la hidratación (el server no lo puede saber).
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  return (
    <div
      className={cn(
        "min-h-screen md:grid",
        collapsed ? "md:grid-cols-[76px_1fr]" : "md:grid-cols-[280px_1fr]"
      )}
    >
      <aside className="hidden border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:z-30 md:flex md:h-screen md:flex-col">
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-5",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/logo.jpg"
                alt="tep agency"
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-lg object-cover"
              />
              <span className="truncate text-base font-semibold">tep agency</span>
            </div>
          )}
          {!collapsed && <div className="flex items-center gap-1">{bell}</div>}
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          <NavLink
            href="/agency/dashboard"
            icon={<LayoutDashboard className="size-5 shrink-0" />}
            collapsed={collapsed}
          >
            Dashboard
          </NavLink>
          <NavLink
            href="/agency/correcciones"
            icon={<Inbox className="size-5 shrink-0" />}
            collapsed={collapsed}
          >
            Bandeja de correcciones
          </NavLink>
          {isManager && (
            <NavLink href="/agency/equipo" icon={<Users className="size-5 shrink-0" />} collapsed={collapsed}>
              Equipo
            </NavLink>
          )}
        </nav>

        <div className="flex flex-col gap-2 border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expandir barra" : "Ocultar barra"}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" />
            ) : (
              <PanelLeftClose className="size-5 shrink-0" />
            )}
            {!collapsed && "Ocultar barra"}
          </button>

          <form action={logout}>
            <Button
              variant="outline"
              type="submit"
              title="Cerrar sesión"
              className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
            >
              <LogOut className="size-4 shrink-0" />
              {!collapsed && "Cerrar sesión"}
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-h-screen">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  collapsed,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);

  return (
    <Link
      href={href}
      // Colapsado el label desaparece, así que el title es la única pista.
      title={collapsed ? String(children) : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      {icon}
      {!collapsed && <span className="truncate">{children}</span>}
    </Link>
  );
}
