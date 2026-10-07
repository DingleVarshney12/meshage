"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

interface RecaptchaApi {
  ready: (callback: () => void) => void;
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
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderWidgetRef = useRef<() => void>(() => {});
  const callbackRef = useRef(onTokenChange);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    [],
  );

  const renderWidget = useCallback(() => {
    if (!siteKey) {
      setError("reCAPTCHA site key is not configured.");
      return;
    }

    if (widgetIdRef.current !== null) return;

    const recaptcha = window.grecaptcha;
    if (!recaptcha?.ready || !recaptcha.render || !containerRef.current) {
      if (retryCountRef.current >= 20) {
        setError("reCAPTCHA could not load. Please refresh the page.");
        return;
      }

      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => renderWidgetRef.current(), 250);
      return;
    }

    recaptcha.ready(() => {
      if (!containerRef.current || widgetIdRef.current !== null) return;

      try {
        widgetIdRef.current = recaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
          callback: (token) => callbackRef.current(token),
          "expired-callback": () => callbackRef.current(null),
          "error-callback": () => {
            callbackRef.current(null);
            setError("reCAPTCHA could not load. Please try again.");
          },
        });
        retryCountRef.current = 0;
        setError(null);
      } catch {
        setError("reCAPTCHA could not load. Please refresh the page.");
      }
    });
  }, []);

  useEffect(() => {
    renderWidgetRef.current = renderWidget;
  }, [renderWidget]);

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
