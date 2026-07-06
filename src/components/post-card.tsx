import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MediaThumb } from "@/components/media-thumb";
import { TIPO_LABEL, type Post } from "@/lib/types";
import { formatPublishDate } from "@/lib/utils";
import { MessageSquare, CalendarDays } from "lucide-react";

export function PostCard({
  post,
  href,
  thumbUrl,
  commentCount,
}: {
  post: Post;
  href: string;
  thumbUrl?: string | null;
  commentCount?: number;
}) {
  return (
    <Link href={href} className="group">
      <Card className="overflow-hidden p-3 transition-shadow hover:shadow-md">
        <MediaThumb plataforma={post.plataforma} tipo={post.tipo} url={thumbUrl} />
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{TIPO_LABEL[post.tipo]}</Badge>
            {post.publish_date && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="size-3" /> {formatPublishDate(post.publish_date)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <StatusBadge estado={post.estado} />
            {!!commentCount && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5" />
                {commentCount}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
