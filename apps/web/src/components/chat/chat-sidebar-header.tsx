"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Globe2,
  LoaderCircle,
  Search,
  Settings2,
  Users,
  UserRoundGroup,
} from "lucide-react";
import AccountMenu from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateGroupDialog from "./create-group-dialog";
import NotificationsBell from "@/components/notifications/notifications-bell";
import { MeshageLogo } from "@/components/brand/meshage-logo";

interface ChatSidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  conversationCount: number;
  hasWorldChat: boolean;
  isJoiningWorld: boolean;
  onJoinWorldChat: () => Promise<void>;
  onGroupCreated: (conversationId: string) => void;
}

export default function ChatSidebarHeader({
  isCollapsed,
  onToggle,
  search,
  onSearchChange,
  conversationCount,
  hasWorldChat,
  isJoiningWorld,
  onJoinWorldChat,
  onGroupCreated,
}: ChatSidebarHeaderProps) {
  const openCreateGroupRef = useRef<(() => void) | null>(null);
  if (isCollapsed) {
    return (
      <header className="border-b bg-background/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            aria-label="Expand chat header"
            title="Expand chat header"
            onClick={onToggle}
          >
            <ChevronDown />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Chats</p>
            <p className="text-xs text-muted-foreground">
              {conversationCount} conversations
            </p>
          </div>

          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Open chat actions"
                title="Chat actions"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled={isJoiningWorld}
                onSelect={() => void onJoinWorldChat()}
              >
                {isJoiningWorld ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Globe2 />
                )}
                {hasWorldChat ? "Open World Chat" : "Join World Chat"}
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => openCreateGroupRef.current?.()}>
                <UserRoundGroup />
                New group
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/friends">
                  <Users />
                  Friends
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings2 />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateGroupDialog
            onCreated={onGroupCreated}
            renderTrigger={(openDialog) => {
              openCreateGroupRef.current = openDialog;
              return null;
            }}
          />
          <AccountMenu />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-background/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/chat" className="flex min-w-0 items-center gap-3">
          <MeshageLogo showWordmark={false} markClassName="size-11" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">
              Meshage<span className="text-primary">.</span>
            </p>
            <p className="text-xs text-muted-foreground">Your conversations</p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <NotificationsBell />
          <AccountMenu />
          <Button
            type="button"
            size="icon"
            aria-label="Collapse chat header"
            title="Collapse header to show more conversations"
            onClick={onToggle}
          >
            <ChevronUp />
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Your space
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Chats</h1>
        </div>

        <CreateGroupDialog onCreated={onGroupCreated} />
      </div>

      <label className="relative mt-5 block">
        <span className="sr-only">Search conversations</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search conversations…"
          className="h-11 rounded-xl bg-card pl-9"
        />
      </label>

      <Button
        type="button"
        variant="outline"
        disabled={isJoiningWorld}
        onClick={() => void onJoinWorldChat()}
        className="mt-3 h-auto w-full justify-start gap-3 rounded-2xl px-3 py-3"
      >
        {isJoiningWorld ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Globe2 className="text-primary" />
        )}

        <span className="text-left">
          <span className="block text-sm font-medium">
            {hasWorldChat ? "Open World Chat" : "Join World Chat"}
          </span>
          <span className="block text-xs font-normal text-muted-foreground">
            Chat with everyone in the community
          </span>
        </span>
      </Button>
    </header>
  );
}
