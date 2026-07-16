import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatch } from "@/lib/notifications";
import type { NotificationRow } from "@/lib/notifications/types";

// Worker de notificaciones. Lee la cola (delivered_at IS NULL), envía por los
// canales activos y marca como entregadas SOLO las que salieron bien.
//
// Lo invoca pg_cron desde Postgres cada 5 min (ver 0018_cron_notificaciones.sql)
// con el secreto compartido en el header x-cron-secret.
//
// Resolución de destinatario:
//  - type='mentioned'         -> payload.to_email (resuelto al encolar)
//  - recipient_role='agency'  -> AGENCY_NOTIFICATIONS_EMAIL
//  - recipient_role='client'  -> clients.contact_email del client_id

// Cada corrida procesa como mucho esto. Con cron cada 5 min alcanza de sobra y
// acota el tiempo de ejecución del request.
const BATCH_SIZE = 50;

// Después de 5 intentos fallidos dejamos de reintentar: si no salió en 5 vueltas
// no es algo transitorio, y last_error queda guardado para diagnosticar.
const MAX_ATTEMPTS = 5;

// El secreto puede llegar de dos formas: x-cron-secret (pg_cron, curl manual) o
// Authorization: Bearer (el formato de Vercel Cron, por si el cron vuelve ahí).
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  if (request.headers.get("x-cron-secret") === expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(); // service_role: salta RLS
  const { data: pending, error } = await admin
    .from("notifications")
    .select("*")
    .is("delivered_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at")
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[dispatch] no se pudo leer la cola", error);
    return NextResponse.json({ error: "queue_read_failed" }, { status: 500 });
  }

  const rows = (pending as NotificationRow[]) ?? [];
  const agencyEmail = process.env.AGENCY_NOTIFICATIONS_EMAIL ?? null;

  // Cache de emails de cliente
  const clientEmail = new Map<string, string | null>();

  let sent = 0;
  let failed = 0;

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

    // Sin destinatario no hay nada que intentar. Cuenta como fallo (no como
    // entrega) para que quede visible en last_error en vez de desaparecer.
    const result = to
      ? await dispatch(row, to)
      : { ok: false as const, error: "sin destinatario" };

    if (result.ok) {
      sent++;
      await admin
        .from("notifications")
        .update({ delivered_at: new Date().toISOString(), attempts: row.attempts + 1 })
        .eq("id", row.id);
    } else {
      failed++;
      await admin
        .from("notifications")
        .update({ attempts: row.attempts + 1, last_error: result.error })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ processed: rows.length, sent, failed });
}

// GET además de POST: los schedulers (Vercel Cron, uptime pings) usan GET por
// defecto. Cuando el cron vivía en vercel.json le pegaba con GET y este endpoint
// solo exportaba POST, así que respondía 405 y la cola no se vaciaba nunca.
export const GET = handle;
export const POST = handle;
