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
      subject: "Nuevo comentario de un cliente",
      body: "Un cliente dejó un comentario en una pieza.",
      actionUrl: `${appUrl}/agency/correcciones`,
    },
    client_approved: {
      subject: "Un cliente aprobó una pieza",
      body: "Una pieza fue aprobada por el cliente.",
      actionUrl: `${appUrl}/agency/dashboard`,
    },
    client_requested_changes: {
      subject: "Un cliente pidió cambios",
      body: "Una pieza tiene cambios pedidos y espera revisión.",
      actionUrl: `${appUrl}/agency/correcciones`,
    },
    agency_resolved: {
      subject: "Hay contenido nuevo para revisar",
      body: "tep agency actualizó una pieza. Entrá a revisarla y aprobarla.",
      actionUrl: `${appUrl}/client/calendario`,
    },
  };
  return templates[row.type];
}

// Despacha una notificación por todos los canales activos.
export async function dispatch(row: NotificationRow, to: string | null) {
  const tpl = render(row);
  const payload: OutboundNotification = { ...tpl, to };
  await Promise.all(
    channels.map((ch) =>
      ch.send(payload).catch((e) => console.error(`[notify:${ch.name}]`, e))
    )
  );
}
