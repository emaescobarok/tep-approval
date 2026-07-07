import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeThumbs } from "@/lib/media";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaThumb } from "@/components/media-thumb";
import { ResolveButton } from "./resolve-button";
import { TIPO_LABEL, type Post } from "@/lib/types";

export default async function CorreccionesPage() {
  await requireAgency();
  const supabase = await createClient();

  // Todas las piezas con cambios pedidos (RLS agencia = ve todo)
  const { data: postRows } = await supabase
    .from("posts")
    .select("*")
    .eq("estado", "cambios_pedidos")
    .order("updated_at", { ascending: false });
  const posts = (postRows as Post[]) ?? [];

  const ids = posts.map((p) => p.id);
  const calIds = [...new Set(posts.map((p) => p.calendar_id))];

  // Mapear calendar -> cliente
  const calToClient = new Map<string, string>();
  if (calIds.length) {
    const { data: cals } = await supabase.from("calendars").select("id, client_id").in("id", calIds);
    const clientIds = [...new Set((cals ?? []).map((c) => c.client_id))];
    const { data: clients } = await supabase.from("clients").select("id, name").in("id", clientIds);
    const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
    (cals ?? []).forEach((c) => calToClient.set(c.id, clientName.get(c.client_id) ?? "Cliente"));
  }

  // Último comentario por pieza
  const lastComment: Record<string, string> = {};
  if (ids.length) {
    const { data: comments } = await supabase
      .from("comments").select("post_id, body, created_at")
      .in("post_id", ids).order("created_at", { ascending: false });
    (comments ?? []).forEach((c) => {
      if (!lastComment[c.post_id]) lastComment[c.post_id] = c.body;
    });
  }

  // Miniatura por pieza (portada del reel o primera media), igual que el calendario.
  const thumbs = await computeThumbs(supabase, posts);

  return (
    <>
      <header className="md:sticky md:top-0 z-10 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold">Bandeja de correcciones</h1>
        <p className="text-sm text-muted-foreground">
          {posts.length} pieza(s) con cambios pedidos por los clientes
        </p>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-3 px-6 py-6">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
            No hay correcciones pendientes. 🎉
          </div>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-20 shrink-0">
                  <MediaThumb plataforma={post.plataforma} tipo={post.tipo} url={thumbs[post.id]} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{calToClient.get(post.calendar_id)}</span>
                    <Badge>{TIPO_LABEL[post.tipo]}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    <span className="font-medium text-warning-foreground">Último comentario: </span>
                    {lastComment[post.id] ?? "—"}
                  </p>
                </div>
                <ResolveButton postId={post.id} clientId="" calendarId={post.calendar_id} />
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </>
  );
}
