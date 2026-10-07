import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPageShell,
  LegalSection,
} from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | Meshage",
  description: "The terms for using Meshage chat and community features.",
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      description="These terms describe the basic rules for using Meshage. By creating an account or using the service, you agree to follow them."
    >
      <LegalSection title="Your account">
        <p>
          Keep your sign-in details secure and provide accurate account
          information. You are responsible for activity through your account.
          Tell Meshage support promptly if you believe someone else has accessed
          it.
        </p>
      </LegalSection>

      <LegalSection title="Using Meshage">
        <p>
          Use Meshage only in ways permitted by applicable law. Do not use the
          service to threaten, harass, impersonate, defraud, or exploit others;
          distribute unlawful or harmful content; violate another person’s
          privacy or intellectual-property rights; interfere with the service;
          or bypass its security and rate limits.
        </p>
      </LegalSection>

      <LegalSection title="Your content and conversations">
        <p>
          You remain responsible for messages, profile information, and media
          that you submit. You confirm that you have the rights needed to share
          that content. You give Meshage permission to host, store, process, and
          transmit it only as needed to operate the features you use, such as
          showing a message to conversation participants or displaying your
          profile according to its visibility setting.
        </p>
        <p>
          Messages and media are visible to the participants of their
          conversation. Meshage does not currently provide end-to-end
          encryption.
        </p>
      </LegalSection>

      <LegalSection title="Profiles and other users">
        <p>
          Respect each person’s profile visibility and the privacy choices they
          make. Do not copy, redistribute, or use another user’s content outside
          the context they shared it in without permission.
        </p>
      </LegalSection>

      <LegalSection title="Availability and account action">
        <p>
          We work to keep Meshage useful and available, but cannot promise
          uninterrupted service or that every feature will always remain
          unchanged. We may restrict or suspend accounts or content that violate
          these terms, create a security risk, or harm users or the service.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services and privacy">
        <p>
          Some features rely on third-party providers, including Google sign-in,
          hosting, database, file storage, Redis, and email delivery. Their
          services may be subject to their own terms. How Meshage handles
          information is described in the{" "}
          <Link className="text-primary underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms when the service or applicable requirements
          change. We will publish the current version on this page and update
          the date above. Continued use after an update means you accept the
          revised terms.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms? Visit the{" "}
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
