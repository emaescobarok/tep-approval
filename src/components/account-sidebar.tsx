"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchAccount } from "@/app/client/actions";
import type { ClientAccount } from "@/lib/accounts";

// Cuentas del dueño. En desktop es una barra lateral (lista con scroll si son
// muchas); en mobile un desplegable compacto, para no llenar la pantalla.
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
    <div>
      {/* Mobile: desplegable */}
      <div className="lg:hidden">
        <AccountDropdown accounts={accounts} activeId={activeId} pending={pending} onPick={elegir} />
      </div>

      {/* Desktop: barra lateral */}
      <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tus cuentas
        </p>
        <nav
          className={cn(
            "flex max-h-[70vh] flex-col gap-1 overflow-y-auto pr-1",
            pending && "opacity-70"
          )}
        >
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} active={a.id === activeId} onClick={() => elegir(a.id)} disabled={pending} />
          ))}
        </nav>
      </aside>
    </div>
  );
}

// Fila de cuenta (logo + nombre + check), reutilizada por la barra lateral.
function AccountRow({
  account: a,
  active,
  onClick,
  disabled,
}: {
  account: ClientAccount;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "border-primary/40 bg-primary/10 font-medium text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <AccountLogo account={a} />
      <span className="min-w-0 flex-1 truncate">{a.name}</span>
      {active && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

function AccountLogo({ account: a }: { account: ClientAccount }) {
  if (a.logo_url) {
    return (
      <span className="size-7 shrink-0 overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.logo_url} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-semibold text-muted-foreground">
      {a.name.charAt(0).toUpperCase()}
    </span>
  );
}

// Desplegable compacto para mobile: un botón con la cuenta activa que abre la lista.
function AccountDropdown({
  accounts,
  activeId,
  pending,
  onPick,
}: {
  accounts: ClientAccount[];
  activeId: string;
  pending: boolean;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = accounts.find((a) => a.id === activeId) ?? accounts[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none hover:bg-muted focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <AccountLogo account={active} />
        <span className="min-w-0 flex-1 truncate text-left font-medium">{active?.name}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              active={a.id === activeId}
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onPick(a.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
