"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/api/auth/auth.api";
import { useQueryParam } from "@/lib/hooks/use-query-param";

export default function VerifyEmailPage() {
  const token = useQueryParam("token");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyEmail({ token });
      setMessage(result.message);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Email verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-10 text-foreground">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            Confirm your email address to finish creating your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {token === null && (
            <p className="text-sm text-muted-foreground">
              Loading verification link…
            </p>
          )}

          {token === "" && (
            <p role="alert" className="text-sm text-destructive">
              Verification token is missing from the link.
            </p>
          )}

          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={!token || loading || Boolean(message)}
          >
            {loading ? "Verifying…" : "Verify email"}
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
