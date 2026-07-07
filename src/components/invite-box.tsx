"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Check, UserPlus } from "lucide-react";
import type { InviteResult } from "@/lib/invites";

// Formulario de invitación reutilizable (clientes o estrategas).
// Muestra el link generado para copiar y el estado del email.
export function InviteBox({
  action,
  label = "Invitar usuario",
  cta = "Enviar invitación",
}: {
  action: (formData: FormData) => Promise<InviteResult>;
  label?: string;
  cta?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const res = await action(fd);
    setBusy(false);
    setResult(res);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  async function copy() {
    if (!result?.link) return;
    await navigator.clipboard.writeText(result.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <label className="text-sm font-medium">{label}</label>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          name="full_name" placeholder="Nombre (opcional)"
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          name="email" type="email" required placeholder="email@ejemplo.com"
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" variant="outline" size="sm" disabled={busy}>
          <UserPlus className="size-4" /> {busy ? "Generando..." : cta}
        </Button>
      </form>

      {result && !result.ok && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      {result?.ok && result.link && (
        <div className="flex flex-col gap-2 rounded-lg bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground">
            Invitación creada. Compartí este link con la persona
            {result.expiresInHours
              ? ` (vence en ${result.expiresInHours} h)`
              : ""}
            :
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly value={result.link}
              className="h-9 flex-1 rounded-lg border border-input bg-card px-2 text-xs outline-none"
            />
            <Button type="button" size="icon" variant="outline" onClick={copy} title="Copiar link">
              {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
