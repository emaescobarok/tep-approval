"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Convierte "YYYY-MM-DD" <-> Date sin desfase de timezone.
function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  required,
  placeholder = "dd/mm/aaaa",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = toDate(value);

  // Cerrar al hacer click afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = selected
    ? selected.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })
    : placeholder;

  return (
    <div ref={ref} className="relative">
      {/* Campo oculto para que el form valide el required */}
      <input type="text" value={value} required={required} readOnly tabIndex={-1}
        aria-hidden className="pointer-events-none absolute size-0 opacity-0" />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{label}</span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-max rounded-xl border border-border bg-popover p-3 shadow-lg">
          <DayPicker
            mode="single"
            locale={es}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (date) {
                onChange(toValue(date));
                setOpen(false);
              }
            }}
            showOutsideDays
            classNames={{
              button_previous: "text-foreground hover:bg-secondary rounded-lg",
              button_next: "text-foreground hover:bg-secondary rounded-lg",
              chevron: "fill-foreground",
              day_button:
                "size-9 rounded-lg text-sm hover:bg-secondary transition-colors",
              selected:
                "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
              today: "[&>button]:font-semibold [&>button]:text-primary",
              outside: "text-muted-foreground/40",
              disabled: "opacity-40",
            }}
            styles={{
              root: { margin: 0, fontFamily: "inherit" },
              month_caption: { textTransform: "capitalize", fontWeight: 600, fontSize: "0.875rem" },
              weekday: { fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 500 },
            }}
          />
        </div>
      )}
    </div>
  );
}
