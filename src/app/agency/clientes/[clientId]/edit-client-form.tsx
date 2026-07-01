"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClientAction } from "@/app/agency/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import type { Client } from "@/lib/types";

export function EditClientForm({ client }: { client: Client }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateClientAction(client.id, new FormData(e.currentTarget));
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Editar cliente
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Editar cliente</span>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <input
        name="name" required defaultValue={client.name} placeholder="Nombre del cliente *"
        className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        name="contact_name" defaultValue={client.contact_name ?? ""} placeholder="Nombre de contacto"
        className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        name="contact_email" type="email" defaultValue={client.contact_email ?? ""} placeholder="Email de contacto"
        className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">
          {client.logo_url ? "Reemplazar logo (opcional)" : "Logo (opcional)"}
        </label>
        <input
          name="logo" type="file" accept="image/*"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
