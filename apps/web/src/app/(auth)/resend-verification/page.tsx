"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationEmail } from "@/lib/api/auth/auth.api";
import { GoogleRecaptcha } from "@/components/auth/google-recaptcha";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [captchaAttempt, setCaptchaAttempt] = useState(0);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA checkbox first.");
      return;
    }
    setLoading(true);

    try {
      const result = await resendVerificationEmail({ email, recaptchaToken });
      setMessage(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Please try again later.",
      );
    } finally {
      setRecaptchaToken("");
      setCaptchaAttempt((attempt) => attempt + 1);
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-10 text-foreground">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Resend verification email</CardTitle>
          <CardDescription>
            Enter the email address you used to create your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <GoogleRecaptcha
                key={captchaAttempt}
                onTokenChange={(token) => setRecaptchaToken(token ?? "")}
              />

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Resend verification email"}
              </Button>
            </form>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
