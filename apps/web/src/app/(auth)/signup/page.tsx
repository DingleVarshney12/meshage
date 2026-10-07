"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
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
import { resendVerificationEmail, signup } from "@/lib/api/auth/auth.api";
import type { SignupInput } from "@/lib/api/auth/auth.types";

export default function SignupPage() {
  const [form, setForm] = useState<SignupInput>({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  function updateField(field: keyof SignupInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signup(form);
      setSubmittedEmail(form.email);
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : "Account creation failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!submittedEmail) return;

    setError(null);
    setResendMessage(null);
    setResending(true);

    try {
      const result = await resendVerificationEmail({
        email: submittedEmail,
      });
      setResendMessage(result.message);
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : "Please try again later.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Meshage<span className="text-primary">.</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2">
          <div className="max-w-lg">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-primary">
              Start a conversation
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Make room for your people.
            </h1>
            <p className="mt-5 leading-7 text-muted-foreground">
              Create your account, verify your email, and get started.
            </p>
          </div>

          <Card className="mx-auto w-full max-w-md rounded-3xl shadow-sm">
            {submittedEmail ? (
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Check your email</CardTitle>
                  <CardDescription>
                    We sent a verification link to {submittedEmail}.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {resendMessage && (
                    <p className="text-sm text-muted-foreground">
                      {resendMessage}
                    </p>
                  )}

                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendVerification}
                    disabled={resending}
                  >
                    {resending ? "Sending…" : "Resend verification email"}
                  </Button>

                  <Button asChild className="w-full">
                    <Link href="/login">Return to sign in</Link>
                  </Button>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Create your account
                  </CardTitle>
                  <CardDescription>
                    Add your details to get started.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display name</Label>
                      <Input
                        id="displayName"
                        autoComplete="name"
                        maxLength={80}
                        required
                        value={form.displayName}
                        onChange={(event) =>
                          updateField("displayName", event.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        autoComplete="username"
                        minLength={3}
                        maxLength={30}
                        pattern="[a-z0-9_]+"
                        title="Use lowercase letters, numbers, and underscores."
                        required
                        value={form.username}
                        onChange={(event) =>
                          updateField(
                            "username",
                            event.target.value.toLowerCase(),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        maxLength={320}
                        required
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={72}
                        required
                        value={form.password}
                        onChange={(event) =>
                          updateField("password", event.target.value)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Use at least 12 characters.
                      </p>
                    </div>

                    {error && (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account…" : "Create account"}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
