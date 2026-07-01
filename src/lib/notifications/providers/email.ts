import type { NotificationChannel, OutboundNotification } from "../index";

// Adapter de email vía Resend. Implementa la interfaz NotificationChannel.
// Para sumar Slack/WhatsApp: crear otro archivo que implemente la misma interfaz.
export const emailChannel: NotificationChannel = {
  name: "email",
  async send(n: OutboundNotification) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.NOTIFICATIONS_FROM_EMAIL;
    if (!apiKey || !from) {
      console.warn("[email] RESEND_API_KEY / FROM sin configurar, se omite el envío");
      return;
    }
    if (!n.to) {
      console.warn("[email] notificación sin destinatario, se omite");
      return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: n.to,
        subject: n.subject,
        html: `<p>${n.body}</p>${n.actionUrl ? `<p><a href="${n.actionUrl}">Ver en la plataforma</a></p>` : ""}`,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend falló: ${res.status} ${await res.text()}`);
    }
  },
};
