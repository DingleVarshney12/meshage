"use client";

import Script from "next/script";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
          shape: "rectangular";
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
  recaptchaToken: string | null;
  onCaptchaConsumed: () => void;
  onSuccess: (user: AuthUser) => void;
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({
  recaptchaToken,
  onCaptchaConsumed,
  onSuccess,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const buttonWidthRef = useRef(0);
  const recaptchaTokenRef = useRef(recaptchaToken);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    recaptchaTokenRef.current = recaptchaToken;
  }, [recaptchaToken]);

  const handleCredential = useCallback(
    async (googleResponse: GoogleCredentialResponse) => {
      setError(null);

      if (!googleResponse.credential) {
        setError("Google did not return a sign-in credential.");
        return;
      }

      const currentRecaptchaToken = recaptchaTokenRef.current;
      if (!currentRecaptchaToken) {
        setError("Please complete the reCAPTCHA checkbox first.");
        return;
      }

      setLoading(true);

      try {
        const result = await loginWithGoogle({
          idToken: googleResponse.credential,
          recaptchaToken: currentRecaptchaToken,
        });

        onSuccess(result.user);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Google sign-in failed. Please try again.",
        );
      } finally {
        onCaptchaConsumed();
        setLoading(false);
      }
    },
    [onCaptchaConsumed, onSuccess],
  );

  const renderGoogleButton = useCallback(() => {
    if (!googleClientId) {
      setError("Google sign-in is not configured.");
      return;
    }

    const buttonElement = buttonRef.current;

    if (!window.google || !buttonElement) {
      setError("Google sign-in could not load. Please refresh the page.");
      return;
    }

    const buttonWidth = Math.floor(buttonElement.clientWidth);

    if (buttonWidth <= 0 || buttonWidth === buttonWidthRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredential,
    });

    buttonElement.replaceChildren();
    window.google.accounts.id.renderButton(buttonElement, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      width: buttonWidth,
    });
    buttonWidthRef.current = buttonWidth;
    setIsGoogleReady(true);
  }, [handleCredential]);

  useEffect(() => {
    const element = buttonRef.current;

    if (!element || !isGoogleReady) {
      return;
    }

    const resizeObserver = new ResizeObserver(renderGoogleButton);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [isGoogleReady, renderGoogleButton]);

  return (
    <div className="w-full min-w-0 space-y-3">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={renderGoogleButton}
        onError={() => {
          setIsGoogleReady(false);
          setError("Google sign-in could not load. Please refresh the page.");
        }}
      />

      <div className="relative w-full overflow-hidden rounded-xl">
        <div
          ref={buttonRef}
          className={`w-full ${isGoogleReady ? "" : "invisible h-11"}`}
        />
        {!isGoogleReady && !error ? (
          <div
            aria-live="polite"
            className="absolute inset-0 flex h-11 items-center justify-center gap-2 rounded-xl border bg-background text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-4 animate-spin" />
            Loading Google sign-in…
          </div>
        ) : null}
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground">
          Signing you in…
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
