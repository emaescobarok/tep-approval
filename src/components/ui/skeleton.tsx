import { cn } from "@/lib/utils";

// Bloque gris que late. Se usa en los loading.tsx: Next los muestra al instante
// mientras el server component resuelve, así el clic responde enseguida.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-secondary", className)} />;
}
