// Tipos del dominio. En un proyecto real se generan con `supabase gen types`,
// acá los definimos a mano para que el scaffolding compile sin CLI.

export type UserRole = "agency" | "client";
export type PostTipo = "carrusel" | "imagen" | "reel_video" | "historia" | "texto";
// Pilar de contenido. Eje distinto de PostTipo: 'tipo' es el formato, 'categoria' el tema.
export type PostCategoria = "marca" | "productos" | "resenas" | "promos" | "faq";
export type PostPlataforma = "instagram" | "facebook" | "tiktok" | "linkedin" | "x";
export type PostEstado = "pendiente" | "aprobado" | "cambios_pedidos";
export type MediaTipo = "image" | "video";

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  client_id: string | null;
  full_name: string | null;
  is_admin: boolean;
  is_pm: boolean;
  mentions_seen_at: string | null;
  created_at: string;
}

// Nivel de un usuario de la agencia (derivado de is_admin / is_pm).
export type AgencyTier = "admin" | "pm" | "strategist";

export const AGENCY_TIER_LABEL: Record<AgencyTier, string> = {
  admin: "Admin",
  pm: "Project Manager",
  strategist: "Estratega",
};

export function agencyTier(p: { is_admin: boolean; is_pm: boolean }): AgencyTier {
  if (p.is_admin) return "admin";
  if (p.is_pm) return "pm";
  return "strategist";
}

export interface ClientAssignment {
  agency_id: string;
  client_id: string;
  created_at: string;
}

export interface Calendar {
  id: string;
  client_id: string;
  month: number;
  year: number;
  intro: string | null;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  storage_path: string;
  media_type: MediaTipo;
  position: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string | null;
  author_role: UserRole;
  body: string;
  mentions: string[]; // ids de profiles mencionados en el cuerpo
  created_at: string;
}

export interface Post {
  id: string;
  calendar_id: string;
  tipo: PostTipo;
  categoria: PostCategoria | null;
  plataforma: PostPlataforma;
  copy: string | null;
  estado: PostEstado;
  position: number;
  publish_date: string | null;
  drive_url: string | null;
  cover_path: string | null;
  created_at: string;
  updated_at: string;
  media?: PostMedia[];
  comments?: Comment[];
}

// Tipos que requieren copy obligatorio
export const TIPOS_CON_COPY_OBLIGATORIO: PostTipo[] = ["carrusel", "texto"];

export const PLATAFORMAS: PostPlataforma[] = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "x",
];

// Lista completa (incluye 'texto' por compatibilidad con piezas ya existentes).
export const TIPOS: PostTipo[] = ["carrusel", "imagen", "reel_video", "historia", "texto"];

// Tipos que se ofrecen al crear una pieza nueva (sin 'texto').
export const TIPOS_FORM: PostTipo[] = ["carrusel", "imagen", "reel_video", "historia"];

export const TIPO_LABEL: Record<PostTipo, string> = {
  carrusel: "Carrusel",
  imagen: "Placa",
  reel_video: "Reel",
  historia: "Historia",
  texto: "Texto",
};

// Pilares de contenido (fijos para todos los clientes). La categoría es opcional:
// las piezas cargadas antes de la 0013 quedan sin categoría.
export const CATEGORIAS: PostCategoria[] = ["marca", "productos", "resenas", "promos", "faq"];

export const CATEGORIA_LABEL: Record<PostCategoria, string> = {
  marca: "Marca",
  productos: "Productos",
  resenas: "Reseñas",
  promos: "Promos",
  faq: "FAQ",
};

// Plataforma por defecto (el selector se sacó del UI, pero el campo es obligatorio en la DB).
export const PLATAFORMA_DEFAULT: PostPlataforma = "instagram";

export const PLATAFORMA_LABEL: Record<PostPlataforma, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
};

export const ESTADO_LABEL: Record<PostEstado, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  cambios_pedidos: "Cambios pedidos",
};

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
