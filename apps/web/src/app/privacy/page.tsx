import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPageShell,
  LegalSection,
} from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Meshage",
  description: "Learn how Meshage handles account, profile, and chat data.",
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="This policy explains what information Meshage handles when you create an account and use chats, profiles, and other features."
    >
      <LegalSection title="Information we handle">
        <p>
          When you create an account, we process your email address, username,
          display name, and password credential. Passwords are stored as
          password hashes, not as plain text. If you use Google sign-in, we
          receive your Google account identifier, verified email address, name,
          and profile picture so we can create or sign in to your Meshage
          account.
        </p>
        <p>
          Depending on the features you use, Meshage also stores profile details
          such as your bio, avatar, and public or private visibility choice;
          friend relationships and requests; group membership; messages,
          replies, reactions, and uploaded attachments; and notifications.
        </p>
        <p>
          The app also processes session cookies and service data needed for
          authentication, rate limiting, online presence, typing indicators, and
          last-seen status.
        </p>
      </LegalSection>

      <LegalSection title="How we use information">
        <ul>
          <li>
            To create accounts, verify email, sign users in, and protect
            sessions.
          </li>
          <li>
            To deliver chats, media, friend requests, group features, and
            notifications.
          </li>
          <li>
            To apply profile visibility settings and show presence features.
          </li>
          <li>
            To prevent abuse, enforce rate limits, troubleshoot errors, and
            maintain the service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Messages and end-to-end encryption">
        <p>
          Meshage does not currently provide end-to-end encryption. Messages and
          attachments are stored and processed by the service to deliver chat
          features. Do not send information that you require to remain
          inaccessible to the service.
        </p>
      </LegalSection>

      <LegalSection title="Profile visibility and sharing">
        <p>
          Public profile information may appear in people discovery. Private
          profiles are hidden from general discovery; profile details are
          available to friends according to the app’s privacy behavior. A
          message and its attachments are shared with the participants of the
          conversation where you send them.
        </p>
      </LegalSection>

      <LegalSection title="Service providers">
        <p>
          Meshage uses third-party providers to host and operate the service.
          Current infrastructure includes Vercel for the web app, Render for the
          API, Supabase for the database and file storage, Upstash for
          Redis-backed service features, Google for sign-in, and an email
          provider configured by Meshage for verification and password emails.
          These providers process information as needed to provide their
          services.
        </p>
        <p>
          We do not sell personal information. We may disclose information when
          required by law or when reasonably necessary to protect users, the
          service, or others.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and security">
        <p>
          Meshage uses secure, HttpOnly authentication cookies to maintain your
          session. The app uses technical safeguards intended to protect
          accounts and stored information, but no online service can guarantee
          absolute security.
        </p>
      </LegalSection>

      <LegalSection title="Retention and your choices">
        <p>
          Notifications are automatically removed after seven days. Other
          account, chat, and attachment data is retained while needed to provide
          the service and until it is deleted through available app features or
          after a valid deletion request. You can update your profile and
          visibility settings in{" "}
          <Link href="/settings" className="text-primary underline">
            Settings
          </Link>
          .
        </p>
        <p>
          To ask about, correct, or request deletion of personal information,
          contact Meshage support
          {supportEmail ? (
            <>
              {" "}
              at{" "}
              <a
                className="text-primary underline"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
            </>
          ) : (
            <>
              {" "}
              through the{" "}
              <Link className="text-primary underline" href="/support">
                Support page
              </Link>
            </>
          )}
          . Some information may need to be retained where the law requires it
          or to resolve security and service issues.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update this policy as Meshage changes. The updated date at the
          top of this page shows when the current version was published. For
          questions, visit the{" "}
          <Link className="text-primary underline" href="/support">
            Support page
          </Link>
          {supportEmail ? (
            <>
              {" "}
              or email{" "}
              <a
                className="text-primary underline"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
            </>
          ) : null}
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
