import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import ProfileSettingsForm from "@/components/profile/profile-settings-form";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <main className="min-h-dvh bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" className="-ml-3 rounded-xl">
          <Link href="/chat">
            <ArrowLeft />
            Back to chats
          </Link>
        </Button>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Meshage / Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Profile settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage how your profile appears to other people.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border bg-card p-5 shadow-xl shadow-slate-900/5 sm:p-8">
          <ProfileSettingsForm />
        </section>
      </div>
    </main>
  );
}
