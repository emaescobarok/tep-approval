"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchAccount } from "@/app/client/actions";
import type { ClientAccount } from "@/lib/accounts";

// Barra lateral con las cuentas del dueño. Clic = cambia la cuenta activa y
// refresca. Se muestra solo cuando hay 2+ cuentas (lo decide quien la usa).
export function AccountSidebar({
  accounts,
  activeId,
}: {
  accounts: ClientAccount[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function elegir(id: string) {
    if (id === activeId) return;
    startTransition(async () => {
      await switchAccount(id);
      router.refresh();
    });
  }

  return (
    <aside className="lg:sticky lg:top-24 h-fit">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tus cuentas
      </p>
      <nav
        className={cn(
          // En mobile: fila con scroll horizontal. En lg+: columna (barra lateral).
          "flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0",
          pending && "opacity-70"
        )}
      >
        {accounts.map((a) => {
          const active = a.id === activeId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => elegir(a.id)}
              disabled={pending}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors lg:w-full lg:shrink",
                "max-w-[12rem] lg:max-w-none",
                active
                  ? "border-primary/40 bg-primary/10 font-medium text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
              )}
            >
              {a.logo_url ? (
                <span className="size-7 shrink-0 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.logo_url} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-semibold text-muted-foreground">
                  {a.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              {active && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
