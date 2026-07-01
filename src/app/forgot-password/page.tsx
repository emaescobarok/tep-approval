import Link from "next/link";
import { requestPasswordReset } from "../login/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
          <p className="text-sm text-muted-foreground">
            Te enviamos un link para restablecerla.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-primary">
              Si el email existe, vas a recibir un enlace en tu casilla.
            </p>
          ) : (
            <form action={requestPasswordReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email" name="email" type="email" required
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button type="submit">Enviar link</Button>
            </form>
          )}
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Volver al login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
