import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe2,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme/theme-toggle";
import { MeshageLogo } from "@/components/brand/meshage-logo";

const conversations = [
  {
    initials: "M",
    name: "Maya Chen",
    message: "That sounds like the perfect plan ✨",
    time: "now",
    color: "bg-rose-100 text-rose-700",
    online: true,
  },
  {
    initials: "W",
    name: "Weekend crew",
    message: "Arjun: Saved you a seat!",
    time: "2m",
    color: "bg-indigo-100 text-indigo-700",
    online: false,
  },
  {
    initials: "A",
    name: "Arjun Mehta",
    message: "Sent a photo",
    time: "18m",
    color: "bg-emerald-100 text-emerald-700",
    online: true,
  },
];

const features = [
  {
    icon: MessageCircle,
    title: "One-to-one chats",
    description:
      "Catch up privately, reply to the moment, and share the photos and files that matter.",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    icon: UsersRound,
    title: "Groups that feel close",
    description:
      "Bring your people together with group conversations, shared media, and live presence.",
    iconClass: "bg-violet-100 text-violet-700",
  },
  {
    icon: Globe2,
    title: "A wider conversation",
    description:
      "Step into World chat to meet the community and join the conversation in real time.",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
];

export default function HomePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklch,var(--primary)_11%,transparent),_transparent_68%)]"
      />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Meshage home"
        >
          <MeshageLogo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="transition hover:text-foreground">
            Features
          </Link>
          <Link href="#privacy" className="transition hover:text-foreground">
            Privacy
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="rounded-xl px-4 shadow-sm shadow-primary/15"
          >
            <Link href="/signup">
              Get started <ArrowUpRight className="ml-1" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_0.92fr] lg:gap-16 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />A little closer, every
            day
          </div>

          <h1 className="text-5xl font-semibold leading-[1.03] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Make room for
            <br />
            <span className="text-primary">better conversations.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            The people you love, the groups you count on, and a community to
            discover—all in one thoughtful place to chat.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl px-6 shadow-lg shadow-primary/20"
            >
              <Link href="/signup">
                Create your account <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-xl px-6"
            >
              <Link href="/chat">Explore Meshage</Link>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" /> Email or Google
              sign-in
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" /> Your profile, your
              choice
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div
            aria-hidden="true"
            className="absolute -left-10 top-12 size-40 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-10 -right-7 size-44 rounded-full bg-emerald-300/20 blur-3xl"
          />

          <div className="relative rounded-[1.75rem] border bg-card/90 p-3 shadow-[0_30px_100px_-38px_rgba(36,55,98,0.4)] backdrop-blur sm:p-5">
            <div className="flex items-center justify-between border-b px-2 pb-4">
              <div>
                <p className="text-sm font-semibold">Your conversations</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  All your people, in one place
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />2
                online
              </span>
            </div>

            <div className="space-y-1 py-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.name}
                  className="flex items-center gap-3 rounded-2xl px-2.5 py-3 transition hover:bg-muted/60 sm:px-3"
                >
                  <div
                    className={`relative grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-semibold ${conversation.color}`}
                  >
                    {conversation.initials}
                    {conversation.online ? (
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">
                        {conversation.name}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {conversation.time}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {conversation.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-muted/70 p-3.5 sm:p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="flex gap-1" aria-hidden="true">
                  <i className="size-1.5 animate-pulse rounded-full bg-primary" />
                  <i className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                  <i className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                </span>
                Maya is typing
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-card px-3.5 py-3 text-xs text-muted-foreground shadow-sm">
                <span>Send a message…</span>
                <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 hidden items-center gap-2.5 rounded-2xl border bg-card px-3.5 py-3 shadow-xl sm:flex lg:-left-8">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <MessagesSquare className="size-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold">Your people</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  Always within reach
                </span>
              </span>
            </div>
          </div>
          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            A glimpse of the Meshage experience
          </p>
        </div>
      </section>

      <section id="features" className="border-y bg-card/50">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Everything in one place
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Made for the way you connect.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              From a quick hello to the group that never sleeps, Meshage keeps
              conversations feeling easy and close.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border bg-card p-6 shadow-sm shadow-foreground/[0.02] transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-foreground/[0.06]"
                >
                  <span
                    className={`grid size-11 place-items-center rounded-2xl ${feature.iconClass}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="privacy"
        className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-center lg:px-12 lg:py-20"
      >
        <div>
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Privacy that starts with you
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose what the world sees.
          </h2>
        </div>
        <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            Keep your profile public so people can find you, or make it private
            and share more only with friends. Meshage gives you profile controls
            that are easy to understand and simple to change.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-sm font-medium">
              <LockKeyhole className="size-4 text-primary" />
              Public or private profile
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-sm font-medium">
              <Zap className="size-4 text-primary" />
              Live presence and chat
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-12 lg:pb-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-primary px-6 py-8 text-primary-foreground shadow-xl shadow-primary/20 sm:flex-row sm:items-center sm:px-10 sm:py-10">
          <div>
            <p className="text-sm font-medium text-primary-foreground/75">
              Your next favorite conversation is waiting.
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Come say hello.
            </h2>
          </div>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-12 rounded-xl px-6"
          >
            <Link href="/signup">
              Join Meshage <ArrowRight className="ml-1" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="font-semibold text-foreground">
            <MeshageLogo markClassName="size-7" wordmarkClassName="text-base" />
          </Link>
          <span>Good conversations start here.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="transition hover:text-foreground">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
