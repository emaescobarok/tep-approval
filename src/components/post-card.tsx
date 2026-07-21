import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MediaThumb } from "@/components/media-thumb";
import { TIPO_LABEL, FASE_LABEL, objetivoLabel, type Post } from "@/lib/types";
import { formatPublishDate } from "@/lib/utils";
import { MessageSquare, CalendarDays } from "lucide-react";

export function PostCard({
  post,
  href,
  thumbUrl,
  commentCount,
  storiesCount = 0,
}: {
  post: Post;
  href: string;
  thumbUrl?: string | null;
  commentCount?: number;
  // Cantidad de historias del mismo día (se muestran como badge, no como tira).
  storiesCount?: number;
}) {
  return (
    <Card className="overflow-hidden p-3">
      <Link href={href} className="group block">
        <MediaThumb
          plataforma={post.plataforma}
          tipo={post.tipo}
          url={thumbUrl}
          previewBg={post.preview_bg}
          previewText={post.preview_text}
        />
      </Link>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{TIPO_LABEL[post.tipo]}</Badge>
          <Badge className="border-accent/30 bg-accent/10 text-accent">
            {objetivoLabel(post)}
          </Badge>
          {storiesCount > 0 && (
            <Badge className="border-amber-400/40 bg-amber-400/15 text-amber-300">
              {storiesCount} {storiesCount === 1 ? "historia" : "historias"}
            </Badge>
          )}
          {post.publish_date && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3" /> {formatPublishDate(post.publish_date)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusBadge estado={post.estado} />
            <Badge className="border-border bg-muted text-muted-foreground">
              {FASE_LABEL[post.fase]}
            </Badge>
          </div>
          {!!commentCount && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              {commentCount}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
