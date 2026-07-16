import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-24" />
      </div>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-6 rounded-2xl border border-border p-5 md:grid-cols-[1.3fr_1fr]">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </main>
    </>
  );
}
