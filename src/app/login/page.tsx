import Link from "next/link";
import Image from "next/image";
import { login } from "./actions";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Fondo aurora difuminado: el lima del theme brillando sobre el negro */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -left-32 top-1/3 size-[38rem] rounded-full bg-accent/20 blur-[120px]" />
        <div className="animate-blob absolute -right-24 bottom-0 size-[34rem] rounded-full bg-accent/10 blur-[130px] [animation-delay:-6s]" />
        <div className="animate-blob absolute left-1/2 top-0 size-[30rem] -translate-x-1/2 rounded-full bg-chart-3/15 blur-[110px] [animation-delay:-12s]" />
      </div>

      {/* Tarjeta glassmorphic */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.jpg"
            alt="tep agency"
            width={56}
            height={56}
            className="mb-4 size-14 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">tep agency</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de contenido</p>
        </div>

        <form action={login} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              placeholder="tu@email.com"
              className="h-11 rounded-xl border border-input bg-card/60 px-4 text-sm text-foreground outline-none backdrop-blur placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contraseña
            </label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 rounded-xl border border-input bg-card/60 px-4 text-sm text-foreground outline-none backdrop-blur placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="mt-1 h-11 rounded-xl text-sm">
            Ingresar
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </div>
  );
}
