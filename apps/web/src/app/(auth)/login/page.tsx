"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { loginWithEmail } from "@/lib/api/auth/auth.api";
import type { AuthUser } from "@/lib/api/auth/auth.types";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getErrorMessage } from "@/lib/utils/errors";
import { MeshageLogo } from "@/components/brand/meshage-logo";
export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    setLoading(true);

    try {
      const result = await loginWithEmail({ email, password });
      setUser(result.user);
      router.replace("/chat");
    } catch (loginError) {
      setError(
        getErrorMessage(loginError, "Sign-in failed. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Meshage home">
            <MeshageLogo markClassName="size-9" wordmarkClassName="text-lg" />
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/">Back home</Link>
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2">
          <div className="max-w-lg">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-primary">
              Your conversations, together
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              A little closer starts with a sign in.
            </h1>
            <p className="mt-5 leading-7 text-muted-foreground">
              Sign in to continue to your friends, groups, and conversations.
            </p>
          </div>

          <Card className="mx-auto w-full max-w-md rounded-3xl shadow-sm">
            {user ? (
              <>
                <CardHeader className="items-center text-center">
                  <CardTitle className="text-2xl">You’re signed in</CardTitle>
                  <CardDescription>
                    Welcome, {user.displayName}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  Your chat workspace will open here as we build it.
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to your Meshage account.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>

                    {error && (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <Button asChild variant="link" className="h-auto px-0">
                      <Link href="/forgot-password">Forgot password?</Link>
                    </Button>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in with email"}
                    </Button>
                  </form>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="flex justify-center">
                    <GoogleSignInButton
                      onSuccess={(authenticatedUser) => {
                        setUser(authenticatedUser);
                        router.replace("/chat");
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-center text-sm">
                    <p>
                      New to Meshage?{" "}
                      <Button asChild variant="link" className="h-auto px-1">
                        <Link href="/signup">Create an account</Link>
                      </Button>
                    </p>

                    <p>
                      <Button asChild variant="link" className="h-auto px-1">
                        <Link href="/resend-verification">
                          Resend verification email
                        </Link>
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
