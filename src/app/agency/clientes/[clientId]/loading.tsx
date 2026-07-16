import { Skeleton } from "@/components/ui/skeleton";

// Imita el layout real (cabecera + grilla de piezas + panel derecho) para que el
// salto al contenido no mueva todo de lugar.
export default function Loading() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-44" />
      </div>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-36" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
              ))}
            </div>
          </div>
        </section>
        <aside className="flex flex-col gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </aside>
      </main>
    </>
  );
}
