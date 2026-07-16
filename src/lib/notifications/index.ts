import type { NotificationRow, NotifTipo } from "./types";
import { emailChannel } from "./providers/email";

// -------- Contrato de canal (desacoplado) --------
export interface OutboundNotification {
  to?: string | null;
  subject: string;
  body: string;
  actionUrl?: string;
}

export interface NotificationChannel {
  name: string;
  send(n: OutboundNotification): Promise<void>;
}

// Canales activos. Sumar Slack/WhatsApp = agregar acá su adapter.
const channels: NotificationChannel[] = [emailChannel];

// -------- Plantillas por tipo de notificación --------
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

function render(row: NotificationRow): Omit<OutboundNotification, "to"> {
  const templates: Record<NotifTipo, Omit<OutboundNotification, "to">> = {
    client_commented: {
      subject: "Nuevo comentario de una cuenta",
      body: "Una cuenta dejó un comentario en una pieza.",
      actionUrl: `${appUrl}/agency/correcciones`,
    },
    client_approved: {
      subject: "Una cuenta aprobó una pieza",
      body: "Una pieza fue aprobada por la cuenta.",
      actionUrl: `${appUrl}/agency/dashboard`,
    },
    client_requested_changes: {
      subject: "Una cuenta pidió cambios",
      body: "Una pieza tiene cambios pedidos y espera revisión.",
      actionUrl: `${appUrl}/agency/correcciones`,
    },
    agency_resolved: {
      subject: "Hay contenido nuevo para revisar",
      body: "tep agency actualizó una pieza. Entrá a revisarla y aprobarla.",
      actionUrl: `${appUrl}/client/calendario`,
    },
    mentioned: {
      subject: "Te mencionaron en un comentario",
      body: `${
        (row.payload.author_name as string) ?? "Alguien"
      } te mencionó en un comentario de una pieza.`,
      actionUrl: `${appUrl}${
        row.recipient_role === "agency" ? "/agency/piezas/" : "/client/pieza/"
      }${row.post_id}`,
    },
  };
  return templates[row.type];
}

export interface DispatchResult {
  ok: boolean;
  error?: string;
}

// Despacha una notificación por todos los canales activos.
//
// Devuelve ok solo si TODOS los canales entregaron. Un canal que falla no puede
// quedar en silencio: el worker necesita saberlo para reintentar, si no la
// notificación se marca entregada y se pierde para siempre.
export async function dispatch(
  row: NotificationRow,
  to: string | null
): Promise<DispatchResult> {
  const tpl = render(row);
  const payload: OutboundNotification = { ...tpl, to };

  const results = await Promise.allSettled(channels.map((ch) => ch.send(payload)));

  const errors = results.flatMap((r, i) => {
    if (r.status === "fulfilled") return [];
    const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
    console.error(`[notify:${channels[i].name}]`, r.reason);
    return [`${channels[i].name}: ${msg}`];
  });

  return errors.length ? { ok: false, error: errors.join(" | ") } : { ok: true };
}
