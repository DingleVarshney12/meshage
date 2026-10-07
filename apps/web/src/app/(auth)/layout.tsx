"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import ThemeToggle from "@/components/theme/theme-toggle";

function RedirectSignedInUsers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAuth();

  const isGuestPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (isGuestPage && status === "authenticated") {
      router.replace("/chat");
    }
  }, [isGuestPage, status, router]);

  if (isGuestPage && (status === "loading" || status === "authenticated")) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Checking your session…
      </main>
    );
  }

  return children;
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="relative">
        <div className="fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        <RedirectSignedInUsers>{children}</RedirectSignedInUsers>
      </div>
    </AuthProvider>
  );
}
