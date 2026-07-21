"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchAccount } from "@/app/client/actions";
import type { ClientAccount } from "@/lib/accounts";

// Selector de cuenta para dueños con varias cuentas. Cambia la cuenta activa y
// refresca. Solo se muestra si hay más de una (lo decide el wrapper server).
export function AccountSwitcher({
  accounts,
  activeId,
}: {
  accounts: ClientAccount[];
  activeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
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

  function elegir(id: string) {
    setOpen(false);
    if (id === activeId) return;
    startTransition(async () => {
      await switchAccount(id);
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium outline-none hover:bg-muted focus:ring-2 focus:ring-ring disabled:opacity-60"
        title="Cambiar de cuenta"
      >
        <span className="max-w-[10rem] truncate">{active?.name}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Tus cuentas</p>
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => elegir(a.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary",
                a.id === activeId && "font-medium"
              )}
            >
              <span className="truncate">{a.name}</span>
              {a.id === activeId && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
