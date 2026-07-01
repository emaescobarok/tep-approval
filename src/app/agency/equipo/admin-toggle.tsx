"use client";

import { useState, useTransition } from "react";
import { setAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldOff } from "lucide-react";

// Botón para promover a admin o quitar el rol admin.
export function AdminToggle({
  agencyId,
  isAdmin,
}: {
  agencyId: string;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setAdmin(agencyId, !isAdmin);
      if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={isAdmin ? "outline" : "secondary"}
        onClick={toggle}
        disabled={pending}
      >
        {isAdmin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
        {isAdmin ? "Quitar admin" : "Hacer admin"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
