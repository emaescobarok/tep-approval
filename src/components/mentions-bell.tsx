"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markMentionsSeen } from "@/lib/mentions-actions";
import type { MentionItem } from "@/lib/mentions";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

// Campana de menciones. `hrefBase` arma el link a cada pieza según el área
// (agencia o cliente).
export function MentionsBell({
  items,
  unread,
  hrefBase,
  placement = "topbar",
}: {
  items: MentionItem[];
  unread: number;
  hrefBase: string;
  // topbar: panel ancho alineado a la derecha (cliente).
  // sidebar: panel acotado al ancho del menú para no tapar el contenido (agencia).
  placement?: "topbar" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      startTransition(async () => {
        await markMentionsSeen();
        router.refresh();
      });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        title="Menciones"
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className={
              "absolute z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg " +
              // Agencia (sidebar): se despliega hacia la derecha, sobre el contenido.
              // Cliente (topbar): se despliega hacia la izquierda.
              (placement === "sidebar" ? "left-0" : "right-0")
            }
          >
            <div className="border-b border-border px-3 py-2 text-sm font-medium">
              Menciones
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No te mencionaron todavía.
              </p>
            ) : (
              <ul className="max-h-96 overflow-auto">
                {items.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`${hrefBase}${m.postId}`}
                      onClick={() => setOpen(false)}
                      className="flex flex-col gap-0.5 border-b border-border px-3 py-2.5 last:border-0 hover:bg-secondary"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{m.author}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(m.createdAt)}
                        </span>
                      </div>
                      {m.context && (
                        <span className="text-[11px] text-muted-foreground">{m.context}</span>
                      )}
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {m.preview}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
