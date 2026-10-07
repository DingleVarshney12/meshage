"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";

function RequireAuthentication({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, error, reloadSession } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Checking your session…
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div className="space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => void reloadSession()}>Try again</Button>
        </div>
      </main>
    );
  }

  return <NotificationsProvider>{children}</NotificationsProvider>;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuthentication>{children}</RequireAuthentication>
    </AuthProvider>
  );
}
