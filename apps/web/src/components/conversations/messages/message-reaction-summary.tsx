"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MessageReactionSummary } from "@/lib/api/conversations/conversations.types";

interface MessageReactionSummaryProps {
  messageId: string;
  reactions: MessageReactionSummary[];
  onToggleReaction: (messageId: string, emoji: string) => void;
}

export default function MessageReactionSummary({
  messageId,
  reactions,
  onToggleReaction,
}: MessageReactionSummaryProps) {
  const totalCount = reactions.reduce(
    (total, reaction) => total + reaction.count,
    0,
  );
  const visibleEmojis = reactions.slice(0, 3);
  const hiddenEmojiCount = reactions.length - visibleEmojis.length;
  const reactedByMe = reactions.some((reaction) => reaction.reactedByMe);
  const reactionDescription = reactions
    .map(({ emoji, count }) => `${emoji} ${count}`)
    .join(", ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${totalCount} reactions. ${reactionDescription}. View or change reactions.`}
          title={`${totalCount} reactions: ${reactionDescription}`}
          className={[
            "h-7 gap-1.5 rounded-full px-2 text-xs",
            reactedByMe ? "border-primary/50 bg-primary/10" : "bg-background",
          ].join(" ")}
        >
          <span aria-hidden="true" className="flex items-center -space-x-0.5">
            {visibleEmojis.map((reaction) => (
              <span key={reaction.emoji}>{reaction.emoji}</span>
            ))}
          </span>
          {hiddenEmojiCount > 0 ? (
            <span className="text-muted-foreground">+{hiddenEmojiCount}</span>
          ) : null}
          <span>{totalCount > 1 ? totalCount : null}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        {reactions.map((reaction) => (
          <DropdownMenuCheckboxItem
            key={reaction.emoji}
            checked={reaction.reactedByMe}
            onCheckedChange={() => onToggleReaction(messageId, reaction.emoji)}
            className="justify-between gap-5"
          >
            <span>{reaction.emoji}</span>
            <span className="text-muted-foreground">{reaction.count}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
