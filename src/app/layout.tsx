import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Sustituto gratuito de Gotham para la introducción de la planificación.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-intro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "tep agency — Aprobación de contenido",
  description: "Planificación mensual y aprobación de contenido para clientes de tep agency.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
