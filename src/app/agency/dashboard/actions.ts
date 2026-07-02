"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireManager } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Sube un logo (File del FormData) al bucket público y devuelve su URL.
async function uploadLogo(
  admin: ReturnType<typeof createAdminClient>,
  logo: File
): Promise<string | null> {
  const ext = (logo.name.split(".").pop() || "png").toLowerCase();
  const path = `logos/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("client-logos")
    .upload(path, logo, { contentType: logo.type, upsert: false });
  if (error) return null;
  return admin.storage.from("client-logos").getPublicUrl(path).data.publicUrl;
}

// Crea un cliente nuevo (con logo opcional). Solo admin.
export async function createClientAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const contactName = String(formData.get("contact_name") || "").trim();
  const contactEmail = String(formData.get("contact_email") || "").trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const admin = createAdminClient();

  const logo = formData.get("logo");
  let logoUrl: string | null = null;
  if (logo instanceof File && logo.size > 0) {
    logoUrl = await uploadLogo(admin, logo);
  }

  const { error } = await admin.from("clients").insert({
    name,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    logo_url: logoUrl,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agency/dashboard");
  return { ok: true };
}

// Edita un cliente (nombre, contacto y/o logo). Admin o Project Manager
// (el PM solo sobre las cuentas que tiene asignadas).
export async function updateClientAction(
  clientId: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireManager();
  // Chequeo de acceso: la RLS solo devuelve el cliente si el manager lo puede ver.
  const scoped = await createClient();
  const { data: allowed } = await scoped.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (!allowed) return { ok: false, error: "No tenés acceso a esta cuenta." };

  const name = String(formData.get("name") || "").trim();
  const contactName = String(formData.get("contact_name") || "").trim();
  const contactEmail = String(formData.get("contact_email") || "").trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const admin = createAdminClient();

  const update: Record<string, string | null> = {
    name,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
  };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const url = await uploadLogo(admin, logo);
    if (url) update.logo_url = url;
  }

  const { error } = await admin.from("clients").update(update).eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agency/dashboard");
  revalidatePath(`/agency/clientes/${clientId}`);
  return { ok: true };
}

// Elimina un cliente y todo su contenido (cascada por FK). Solo admin.
// Nota: los archivos ya subidos al Storage quedan huérfanos; para el MVP se
// aceptan. Se pueden limpiar luego con un job que borre la carpeta <client_id>/.
export async function deleteClientAction(
  clientId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  // Limpieza best-effort de la carpeta del cliente en Storage
  try {
    const { data: files } = await admin.storage.from("post-media").list(clientId, { limit: 1000 });
    if (files?.length) {
      const paths = files.map((f: { name: string }) => `${clientId}/${f.name}`);
      await admin.storage.from("post-media").remove(paths);
    }
  } catch {
    // ignora errores de storage; la baja del cliente sigue
  }

  const { error } = await admin.from("clients").delete().eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agency/dashboard");
  return { ok: true };
}
