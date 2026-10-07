import type { ReactNode } from "react";
import Link from "next/link";
import { MeshageLogo } from "@/components/brand/meshage-logo";
import { LegalLinks } from "@/components/legal/legal-links";

interface LegalPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function LegalPageShell({
  title,
  description,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-dvh bg-background px-5 py-6 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Meshage home">
            <MeshageLogo markClassName="size-9" wordmarkClassName="text-lg" />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Back to home
          </Link>
        </header>

        <article className="mt-10 rounded-3xl border bg-card p-6 shadow-sm sm:mt-14 sm:p-10">
          <header className="mb-8 border-b pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Meshage
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              {description}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Last updated: October 7, 2026
            </p>
          </header>

          <div className="space-y-8 text-sm leading-7 text-muted-foreground [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-foreground">
            {children}
          </div>
        </article>

        <footer className="flex flex-col gap-4 px-1 py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Good conversations start here.
          </p>
          <LegalLinks className="text-xs" />
        </footer>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
