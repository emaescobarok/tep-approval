"use client";

import { useState, useTransition } from "react";
import { setAssignment } from "./actions";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Chip que asigna/desasigna un cliente a un estratega.
export function AssignmentToggle({
  agencyId,
  clientId,
  clientName,
  initial,
}: {
  agencyId: string;
  clientId: string;
  clientName: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(() => {
      void setAssignment(agencyId, clientId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
        on
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/40"
      )}
    >
      {on && <Check className="size-3" />}
      {clientName}
    </button>
  );
}
