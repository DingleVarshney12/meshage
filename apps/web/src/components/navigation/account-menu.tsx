"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings2, Users } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { FriendsAvatar } from "@/components/friends/friends-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import ThemeToggle from "@/components/theme/theme-toggle";
export default function AccountMenu() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Open account menu"
          className="h-10 gap-2 rounded-xl px-2"
        >
          <FriendsAvatar
            name={user?.displayName ?? "Meshage user"}
            avatarUrl={user?.avatarUrl ?? null}
            size="sm"
          />
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">
            {user?.displayName ?? "Meshage user"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user?.email ?? ""}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/friends">
            <Users />
            Friends
          </Link>
        </DropdownMenuItem>

        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm text-muted-foreground">Appearance</span>
          <ThemeToggle className="size-8" />
        </div>

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings2 />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void handleSignOut()}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
