"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Sirve tanto para la invitación inicial (definir contraseña) como para el reset.
// El link de Supabase deja una sesión de recovery activa al llegar acá.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    // Sin sesión de recovery activa no hay nada que actualizar: mensaje claro.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      setError("El link no es válido o expiró. Pedí uno nuevo desde «Olvidé mi contraseña».");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(`No se pudo guardar la contraseña: ${error.message}`);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Definí tu contraseña</CardTitle>
          <p className="text-sm text-muted-foreground">
            Elegí una contraseña para acceder a tu contenido.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">Nueva contraseña</label>
              <input
                id="password" type="password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar y entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
