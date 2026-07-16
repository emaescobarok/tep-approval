"use client";

import { useState, useTransition } from "react";
import { setAgencyRole } from "./actions";
import { AGENCY_TIER_LABEL, type AgencyTier } from "@/lib/types";

// Selector de nivel de un miembro de la agencia. Solo lo renderiza el admin.
export function RoleSelect({
  agencyId,
  tier,
  locked = false,
}: {
  agencyId: string;
  tier: AgencyTier;
  locked?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(next: AgencyTier) {
    if (next === tier) return;
    setError(null);
    startTransition(async () => {
      const res = await setAgencyRole(agencyId, next);
      if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={tier}
        disabled={pending || locked}
        title={locked ? "El super admin no se puede cambiar" : undefined}
        onChange={(e) => onChange(e.target.value as AgencyTier)}
        className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        {(["strategist", "pm", "admin"] as AgencyTier[]).map((t) => (
          <option key={t} value={t}>
            {AGENCY_TIER_LABEL[t]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
