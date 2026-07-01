"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

// Dropdown custom (no usa el <select> nativo del sistema operativo).
// Cerrado: caja redondeada. Abierto: panel con ítems redondeados y el
// seleccionado resaltado en verde.
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-card px-3 text-sm outline-none transition-colors",
          open ? "border-primary ring-2 ring-ring/40" : "border-input hover:border-primary/50"
        )}
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-border bg-popover p-1 shadow-lg animate-fade-in">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                {o.label}
                {active && <Check className="size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
