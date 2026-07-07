"use client";

import { useMemo, useState, useTransition } from "react";
import { setAssignment } from "./actions";
import { cn } from "@/lib/utils";
import { Check, Plus, X, Search } from "lucide-react";

interface ClientOpt {
  id: string;
  name: string;
}

// Selector compacto de cuentas asignadas: muestra solo las asignadas como chips
// y un botón que abre un panel con buscador para asignar/quitar el resto.
export function AssignmentPicker({
  agencyId,
  clients,
  assignedIds,
}: {
  agencyId: string;
  clients: ClientOpt[];
  assignedIds: string[];
}) {
  const [assigned, setAssigned] = useState<Set<string>>(new Set(assignedIds));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const byId = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  }, [clients, query]);

  function toggle(clientId: string) {
    const next = !assigned.has(clientId);
    setAssigned((prev) => {
      const s = new Set(prev);
      if (next) s.add(clientId);
      else s.delete(clientId);
      return s;
    });
    startTransition(async () => {
      const res = await setAssignment(agencyId, clientId, next);
      if (!res.ok) {
        // revierte
        setAssigned((prev) => {
          const s = new Set(prev);
          if (next) s.delete(clientId);
          else s.add(clientId);
          return s;
        });
        if (res.error) alert(res.error);
      }
    });
  }

  const assignedList = clients.filter((c) => assigned.has(c.id));

  return (
    <div className="flex flex-col gap-2">
      {/* Chips de las cuentas asignadas */}
      <div className="flex flex-wrap items-center gap-2">
        {assignedList.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            {byId.get(c.id)}
            <button
              type="button"
              onClick={() => toggle(c.id)}
              title="Quitar"
              className="text-primary/70 hover:text-primary"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="size-3" /> Asignar cuentas
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <div className="absolute left-0 z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar cuenta..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <ul className="max-h-64 overflow-auto p-1">
                  {filtered.map((c) => {
                    const on = assigned.has(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => toggle(c.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                        >
                          <span className="truncate">{c.name}</span>
                          {on && <Check className="size-3.5 shrink-0 text-primary" />}
                        </button>
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                      Sin resultados.
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {assignedList.length === 0 && (
          <span className="text-xs text-muted-foreground">Ninguna asignada.</span>
        )}
      </div>
    </div>
  );
}
