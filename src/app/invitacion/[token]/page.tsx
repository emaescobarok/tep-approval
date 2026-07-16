import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/server";
import { AcceptForm } from "./accept-form";

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invitations")
    .select("email, full_name, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  const invalid =
    !inv || !!inv.used_at || new Date(inv.expires_at).getTime() < Date.now();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -left-32 top-1/3 size-[38rem] rounded-full bg-accent/20 blur-[120px]" />
        <div className="animate-blob absolute -right-24 bottom-0 size-[34rem] rounded-full bg-accent/10 blur-[130px] [animation-delay:-6s]" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.jpg"
            alt="tep agency"
            width={56}
            height={56}
            className="mb-4 size-14 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">tep agency</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invalid ? "Invitación" : "Te invitaron a la plataforma"}
          </p>
        </div>

        {invalid ? (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Este link de invitación no es válido, ya fue usado o expiró. Pedile
              a la agencia que te genere uno nuevo.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <AcceptForm token={token} email={String(inv!.email)} />
        )}
      </div>
    </div>
  );
}
