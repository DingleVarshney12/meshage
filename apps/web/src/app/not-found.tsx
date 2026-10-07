import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { MeshageLogo } from "@/components/brand/meshage-logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found | Meshage",
};

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-3xl border bg-card p-8 text-center shadow-xl shadow-primary/5 sm:p-12">
        <Link href="/" aria-label="Meshage home" className="inline-flex">
          <MeshageLogo markClassName="size-10" wordmarkClassName="text-lg" />
        </Link>
        <div className="mx-auto mt-10 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle className="size-8" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          This page isn’t here.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          The link may be outdated, or the page may have moved. Head back to
          your conversations or explore Meshage.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="rounded-xl">
            <Link href="/chat">Go to chats</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/">
              <ArrowLeft />
              Back to home
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
