"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import ProfileSettingsForm from "@/components/profile/profile-settings-form";
import { BrowserNotificationsSettings } from "@/components/notifications/browser-notifications-settings";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type SettingsSection = "profile" | "system";

const settingsNavigation: {
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof UserRound;
}[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Your details and visibility",
    icon: UserRound,
  },
  {
    id: "system",
    label: "System settings",
    description: "Theme and notifications",
    icon: Monitor,
  },
];

function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sun className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Appearance</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Choose how Meshage looks on this device.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {options.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={theme === value ? "default" : "outline"}
                className="rounded-xl"
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SettingsPageClient() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");
  const selectedSection = settingsNavigation.find(
    (section) => section.id === activeSection,
  )!;

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Personalize your profile and how Meshage works on this device.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
          <aside className="h-fit rounded-3xl border bg-card p-2 lg:sticky lg:top-8">
            <nav
              aria-label="Settings sections"
              className="flex gap-2 lg:flex-col"
            >
              {settingsNavigation.map(
                ({ id, label, description, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    aria-current={activeSection === id ? "page" : undefined}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors lg:flex-none",
                      activeSection === id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {label}
                      </span>
                      <span className="hidden truncate text-xs opacity-75 sm:block">
                        {description}
                      </span>
                    </span>
                  </button>
                ),
              )}
            </nav>
          </aside>

          <section className="min-w-0">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">{selectedSection.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedSection.description}
              </p>
            </div>

            {activeSection === "profile" ? (
              <div className="rounded-3xl border bg-card p-5 shadow-xl shadow-slate-900/5 sm:p-8">
                <ProfileSettingsForm />
              </div>
            ) : (
              <div className="space-y-4">
                <ThemeSettings />
                <BrowserNotificationsSettings />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
