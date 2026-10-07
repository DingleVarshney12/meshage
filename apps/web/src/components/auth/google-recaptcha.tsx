"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

interface RecaptchaApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "light";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => number;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: RecaptchaApi;
  }
}

interface GoogleRecaptchaProps {
  onTokenChange: (token: string | null) => void;
}

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export function GoogleRecaptcha({ onTokenChange }: GoogleRecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const callbackRef = useRef(onTokenChange);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);

  const renderWidget = useCallback(() => {
    if (!siteKey) {
      setError("reCAPTCHA site key is not configured.");
      return;
    }

    if (
      !window.grecaptcha ||
      !containerRef.current ||
      widgetIdRef.current !== null
    )
      return;

    try {
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => callbackRef.current(token),
        "expired-callback": () => callbackRef.current(null),
        "error-callback": () => {
          callbackRef.current(null);
          setError("reCAPTCHA could not load. Please try again.");
        },
      });
      setError(null);
    } catch {
      setError("reCAPTCHA could not load. Please refresh the page.");
    }
  }, []);

  return (
    <div className="space-y-2">
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() =>
          setError("reCAPTCHA could not load. Please refresh the page.")
        }
      />
      <div ref={containerRef} className="min-h-[78px]" />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
