"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";
import { loginWithGoogle } from "@/lib/api/auth/auth.api";
import type { AuthUser } from "@/lib/api/auth/auth.types";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }): void;
      renderButton(
        element: HTMLElement,
        options: {
          theme: "outline";
          size: "large";
          width: number;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

interface GoogleSignInButtonProps {
  onSuccess: (user: AuthUser) => void;
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCredential = useCallback(
    async (googleResponse: GoogleCredentialResponse) => {
      setError(null);

      if (!googleResponse.credential) {
        setError("Google did not return a sign-in credential.");
        return;
      }

      setLoading(true);

      try {
        const result = await loginWithGoogle({
          idToken: googleResponse.credential,
        });

        onSuccess(result.user);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Google sign-in failed. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  const initializeGoogleButton = useCallback(() => {
    if (!googleClientId) {
      setError("Google sign-in is not configured.");
      return;
    }

    if (!window.google || !buttonRef.current) {
      setError("Google sign-in could not load. Please refresh the page.");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredential,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
    });
  }, [handleCredential]);

  return (
    <div className="space-y-3">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleButton}
        onError={() =>
          setError("Google sign-in could not load. Please refresh the page.")
        }
      />

      <div ref={buttonRef} />

      {loading && (
        <p className="text-center text-sm text-muted-foreground">
          Signing you in…
        </p>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
