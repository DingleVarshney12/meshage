import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";

import { FriendsAvatar } from "@/components/friends/friends-avatar";
import type { ConversationListItem } from "@/lib/api/conversations/conversations.types";
import type { UserPresence } from "@/lib/realtime/realtime.types";

interface ConversationListItemProps {
  conversation: ConversationListItem;
  currentUserId: string;
  presenceByUserId: Record<string, UserPresence>;
  isTyping: boolean;
}

function formatConversationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const isToday = new Date().toDateString() === date.toDateString();

  return new Intl.DateTimeFormat(undefined, {
    ...(isToday
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" }),
  }).format(date);
}

function formatLastSeen(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return "Offline";
  }

  const date = new Date(lastSeenAt);

  if (Number.isNaN(date.getTime())) {
    return "Offline";
  }

  return `Last seen ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

export default function ConversationListItemCard({
  conversation,
  currentUserId,
  presenceByUserId,
  isTyping,
}: ConversationListItemProps) {
  const otherMember = conversation.members.find(
    (member) => member.id !== currentUserId,
  );

  const isDirect = conversation.type === "direct";
  const title = isDirect
    ? (otherMember?.displayName ?? "Direct conversation")
    : (conversation.title ??
      (conversation.type === "world" ? "World chat" : "Group chat"));

  const presence =
    isDirect && otherMember ? presenceByUserId[otherMember.id] : undefined;

  const lastMessage = conversation.lastMessage;
  const messageBody =
    lastMessage?.body ??
    (lastMessage?.type === "media" ? "Sent an attachment" : "Message");

  let preview = lastMessage ? messageBody : "Start a conversation";

  if (lastMessage?.replyTo) {
    if (isDirect) {
      // Direct chat mein bas reply ka text dikhayenge.
      preview = messageBody;
    } else {
      const senderLabel =
        lastMessage.sender?.id === currentUserId
          ? "You"
          : (lastMessage.sender?.displayName ?? "Someone");

      const repliedToCurrentUser =
        lastMessage.replyTo.sender?.id === currentUserId;

      preview = repliedToCurrentUser
        ? `${senderLabel} replied to you: ${messageBody}`
        : `${senderLabel} replied: ${messageBody}`;
    }
  } else if (lastMessage?.sender?.id === currentUserId) {
    preview = `You: ${messageBody}`;
  } else if (!isDirect && lastMessage?.sender?.displayName) {
    preview = `${lastMessage.sender.displayName}: ${messageBody}`;
  }

  const displayPreview = isTyping
    ? isDirect
      ? "Typing…"
      : "Someone is typing…"
    : preview;
  return (
    <Link
      href={`/chat/${conversation.id}`}
      className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative shrink-0">
        <FriendsAvatar
          name={title}
          avatarUrl={
            isDirect ? (otherMember?.avatarUrl ?? null) : conversation.avatarUrl
          }
          size="default"
        />

        {isDirect ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground">
            <MessageCircle className="size-2.5" />
          </span>
        ) : (
          <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-card bg-secondary text-secondary-foreground">
            <Users className="size-2.5" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {title}
            </h2>

            {presence ? (
              <span
                aria-label={presence.isOnline ? "Online" : "Offline"}
                title={presence.isOnline ? "Online" : "Offline"}
                className={[
                  "size-2 shrink-0 rounded-full",
                  presence.isOnline ? "bg-emerald-500" : "bg-slate-300",
                ].join(" ")}
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <time className="text-[10px] text-muted-foreground">
              {formatConversationTime(conversation.updatedAt)}
            </time>

            {conversation.unreadCount > 0 ? (
              <span
                aria-label={`${conversation.unreadCount} unread messages`}
                className="grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground"
              >
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={[
              "min-w-0 truncate text-xs",
              isTyping ? "font-medium text-primary" : "text-muted-foreground",
            ].join(" ")}
          >
            {displayPreview}
          </p>

          {isDirect && presence ? (
            <span
              className={[
                "shrink-0 text-[10px]",
                presence.isOnline
                  ? "font-medium text-emerald-600"
                  : "text-muted-foreground",
              ].join(" ")}
              title={formatLastSeen(presence.lastSeenAt)}
            >
              {presence.isOnline
                ? "Online"
                : formatLastSeen(presence.lastSeenAt)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
