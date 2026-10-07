import Link from "next/link";
import { LoaderCircle, MessageCircle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ConversationListItem } from "@/lib/api/conversations/conversations.types";
import type { UserPresence } from "@/lib/realtime/realtime.types";
import ConversationListItemCard from "./conversation-list-item";

interface ConversationListProps {
  conversations: ConversationListItem[];
  currentUserId: string;
  presenceByUserId: Record<string, UserPresence>;
  typingByConversationId: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function ConversationList({
  conversations,
  currentUserId,
  presenceByUserId,
  typingByConversationId,
  isLoading,
  error,
  onRetry,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="grid min-h-56 place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin text-primary" />
          Loading conversations…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-2 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="mx-2 rounded-3xl border border-dashed bg-background/70 px-5 py-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle className="size-5" />
        </div>

        <h2 className="mt-4 text-sm font-semibold">Your inbox is quiet</h2>
        <p className="mx-auto mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
          Add a friend and start your first conversation.
        </p>

        <Button asChild size="sm" className="mt-4 rounded-xl">
          <Link href="/friends">
            <Users />
            Find friends
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <nav aria-label="Your conversations" className="space-y-1">
      {conversations.map((conversation) => (
        <ConversationListItemCard
          key={conversation.id}
          conversation={conversation}
          currentUserId={currentUserId}
          presenceByUserId={presenceByUserId}
          isTyping={typingByConversationId[conversation.id] ?? false}
        />
      ))}
    </nav>
  );
}
