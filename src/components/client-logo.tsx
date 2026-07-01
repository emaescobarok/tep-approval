import { cn } from "@/lib/utils";

// Muestra el logo del cliente o, si no tiene, un cuadro con su inicial.
export function ClientLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-sm font-bold text-muted-foreground",
        className
      )}
    >
      {logoUrl ? (
        // object-cover: llena el cuadrado. Como los logos son 1:1 (1000x1000)
        // no se recorta nada y se ve grande.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}
