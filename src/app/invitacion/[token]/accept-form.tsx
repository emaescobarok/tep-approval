"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "./actions";

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async (fd) => {
        setBusy(true);
        setError(null);
        const res = await acceptInvitation(token, fd);
        // Si vuelve, es porque hubo error (en éxito redirige).
        setBusy(false);
        if (res && !res.ok) setError(res.error);
      }}
      className="mt-8 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input
          value={email}
          readOnly
          className="h-11 rounded-xl border border-input bg-card/60 px-4 text-sm text-muted-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Elegí tu contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className="h-11 rounded-xl border border-input bg-card/60 px-4 text-sm text-foreground outline-none backdrop-blur placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={busy} className="mt-1 h-11 rounded-xl text-sm">
        {busy ? "Entrando..." : "Crear cuenta y entrar"}
      </Button>
    </form>
  );
}
