import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { MentionsBellServer } from "@/components/mentions-bell-server";
import { LogOut } from "lucide-react";

export function Topbar({
  title,
  subtitle,
  right,
  logoUrl,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  logoUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="size-9 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={title} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              Tep
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <MentionsBellServer />
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit" title="Cerrar sesión">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
