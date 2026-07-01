export type NotifTipo =
  | "client_commented"
  | "client_approved"
  | "client_requested_changes"
  | "agency_resolved";

export interface NotificationRow {
  id: string;
  type: NotifTipo;
  recipient_role: "agency" | "client";
  client_id: string | null;
  post_id: string | null;
  payload: Record<string, unknown>;
  delivered_at: string | null;
  created_at: string;
}
