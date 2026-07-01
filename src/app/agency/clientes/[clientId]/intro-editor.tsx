"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateIntro } from "./actions";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

// Editor de la introducción de la planificación del mes.
export function IntroEditor({
  clientId,
  month,
  year,
  initial,
}: {
  clientId: string;
  month: number;
  year: number;
  initial: string | null;
}) {
  const router = useRouter();
  const [intro, setIntro] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    await updateIntro({ clientId, month, year, intro });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        rows={5}
        placeholder="Escribí la introducción de la planificación del mes (estrategia, recomendaciones, a tener en cuenta...). El cliente la ve arriba de su calendario."
        className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={busy}>
          <Save className="size-4" /> {busy ? "Guardando..." : "Guardar introducción"}
        </Button>
        {saved && <span className="text-sm text-primary">Guardado ✓</span>}
      </div>
    </div>
  );
}
