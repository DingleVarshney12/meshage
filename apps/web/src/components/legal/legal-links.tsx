import Link from "next/link";

interface LegalLinksProps {
  className?: string;
}

export function LegalLinks({ className }: LegalLinksProps) {
  return (
    <nav
      aria-label="Legal and support links"
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground ${className ?? ""}`}
    >
      <Link className="transition hover:text-foreground" href="/privacy">
        Privacy Policy
      </Link>
      <Link className="transition hover:text-foreground" href="/terms">
        Terms of Service
      </Link>
      <Link className="transition hover:text-foreground" href="/support">
        Support
      </Link>
    </nav>
  );
}
