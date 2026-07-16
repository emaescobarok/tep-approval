import Link from "next/link";

// Flecha de navegación entre piezas. Si no hay destino, se muestra deshabilitada.
export function NavArrow({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const base =
    "flex size-9 items-center justify-center rounded-lg border border-border transition-colors";
  if (!href) {
    return (
      <span
        aria-disabled
        title={label}
        className={`${base} cursor-not-allowed text-muted-foreground/40`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} title={label} aria-label={label} className={`${base} text-muted-foreground hover:bg-muted hover:text-foreground`}>
      {children}
    </Link>
  );
}
