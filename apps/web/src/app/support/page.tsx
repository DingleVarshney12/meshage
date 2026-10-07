import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Support | Meshage",
  description: "Get help with your Meshage account and conversations.",
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const supportTopics = [
  {
    icon: UserRound,
    title: "Sign-in and account access",
    description:
      "Use Forgot password on the login page to reset a password, or resend the verification email if your account is not verified yet.",
    href: "/forgot-password",
    linkText: "Reset your password",
  },
  {
    icon: ShieldCheck,
    title: "Profile and privacy",
    description:
      "Change your display name, bio, avatar, and profile visibility from Settings.",
    href: "/login",
    linkText: "Sign in to manage settings",
  },
  {
    icon: UsersRound,
    title: "Friends and conversations",
    description:
      "Open Friends to manage requests and your friends list. Conversation options are available from the chat interface.",
    href: "/login",
    linkText: "Open Meshage",
  },
];

export default function SupportPage() {
  return (
    <LegalPageShell
      title="Support"
      description="Find help with your Meshage account, profile, and conversations."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {supportTopics.map(({ icon: Icon, ...topic }) => (
          <section
            key={topic.title}
            className="rounded-2xl border bg-background p-5"
          >
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {topic.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {topic.description}
            </p>
            <Link
              className="mt-4 inline-flex text-sm font-medium text-primary underline"
              href={topic.href}
            >
              {topic.linkText}
            </Link>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Contact Meshage
            </h2>
            {supportEmail ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                For account, privacy, or technical questions, email{" "}
                <a
                  className="font-medium text-primary underline"
                  href={`mailto:${supportEmail}`}
                >
                  {supportEmail}
                </a>
                . Please do not include passwords or authentication codes in
                your message.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                For account and technical questions, use the account help links
                above. A support email address will be listed here when
                configured.
              </p>
            )}
          </div>
        </div>
      </section>
    </LegalPageShell>
  );
}
