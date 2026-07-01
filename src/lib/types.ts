// Tipos del dominio. En un proyecto real se generan con `supabase gen types`,
// acá los definimos a mano para que el scaffolding compile sin CLI.

export type UserRole = "agency" | "client";
export type PostTipo = "carrusel" | "imagen" | "reel_video" | "historia" | "texto";
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
  created_at: string;
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
  created_at: string;
}

export interface Post {
  id: string;
  calendar_id: string;
  tipo: PostTipo;
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
