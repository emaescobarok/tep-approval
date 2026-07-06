import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatch } from "@/lib/notifications";
import type { NotificationRow } from "@/lib/notifications/types";

// Worker de notificaciones. Lee la cola (delivered_at IS NULL), envía por los
// canales activos y marca como entregadas. Pensado para correr por cron
// (Vercel Cron / Supabase Scheduled Function) con un secreto compartido.
//
// Resolución de destinatario (MVP):
//  - recipient_role='agency' -> AGENCY_NOTIFICATIONS_EMAIL
//  - recipient_role='client' -> clients.contact_email del client_id
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(); // service_role: salta RLS
  const { data: pending } = await admin
    .from("notifications")
    .select("*")
    .is("delivered_at", null)
    .order("created_at")
    .limit(50);

  const rows = (pending as NotificationRow[]) ?? [];
  const agencyEmail = process.env.AGENCY_NOTIFICATIONS_EMAIL ?? null;

  // Cache de emails de cliente
  const clientEmail = new Map<string, string | null>();

  let sent = 0;
  for (const row of rows) {
    let to: string | null = null;
    if (row.type === "mentioned") {
      // La persona mencionada puede ser de agencia o de cliente: su email viaja
      // resuelto en el payload al encolar.
      to = (row.payload.to_email as string) ?? null;
    } else if (row.recipient_role === "agency") {
      to = agencyEmail;
    } else if (row.client_id) {
      if (!clientEmail.has(row.client_id)) {
        const { data } = await admin
          .from("clients").select("contact_email").eq("id", row.client_id).single();
        clientEmail.set(row.client_id, data?.contact_email ?? null);
      }
      to = clientEmail.get(row.client_id) ?? null;
    }

    await dispatch(row, to);
    await admin.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("id", row.id);
    sent++;
  }

  return NextResponse.json({ processed: sent });
}
