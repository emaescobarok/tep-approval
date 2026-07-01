import { markResolved } from "./actions";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

// clientId/calendarId se dejan como props por si luego se quiere enlazar al detalle.
export function ResolveButton({ postId }: { postId: string; clientId?: string; calendarId?: string }) {
  const action = markResolved.bind(null, postId);
  return (
    <form action={action} className="shrink-0">
      <Button type="submit" size="sm">
        <Check className="size-4" /> Marcar corregida
      </Button>
    </form>
  );
}
