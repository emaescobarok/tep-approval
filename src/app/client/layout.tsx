import { requireClient } from "@/lib/auth";

// Guard de área cliente: solo usuarios con role='client'.
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireClient();
  return <div className="min-h-screen">{children}</div>;
}
