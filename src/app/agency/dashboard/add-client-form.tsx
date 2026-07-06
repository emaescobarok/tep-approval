"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createClientAction(new FormData(e.currentTarget));
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo crear la cuenta.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Agregar cuenta
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Nueva cuenta</span>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <input
        name="name" required placeholder="Nombre de la cuenta *"
        className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        name="contact_name" placeholder="Nombre de contacto (opcional)"
        className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        name="contact_email" type="email" placeholder="Email de contacto (opcional)"
        className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Logo (opcional)</label>
        <input
          name="logo" type="file" accept="image/*"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} size="sm">
        {busy ? "Creando..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
