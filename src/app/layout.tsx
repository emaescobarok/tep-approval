import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tep agency — Aprobación de contenido",
  description: "Planificación mensual y aprobación de contenido para clientes de tep agency.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
