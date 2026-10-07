import type { Metadata } from "next";
import ThemeProvider from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meshage - private conversations",
  description: "A modern chat app for friends, groups, and communities.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Meshage",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/meshage-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
