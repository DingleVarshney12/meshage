"use client";

import { useEffect, useRef } from "react";
import { MessageCircle, Reply } from "lucide-react";

import { FriendsAvatar } from "@/components/friends/friends-avatar";
import { Button } from "@/components/ui/button";
import type { ConversationMessage } from "@/lib/api/conversations/conversations.types";
import MessageReactionPicker from "./message-reaction-picker";
import MessageAttachmentContent from "./message-attachment-content";
import MessageActionsMenu from "./message-actions-menu";
import MessageReactionSummary from "./message-reaction-summary";
import type { ConversationListItem } from "@/lib/api/conversations/conversations.types";
interface MessageListProps {
  messages: ConversationMessage[];
  currentUserId: string;
  isLoading: boolean;
  isOtherUserTyping: boolean;
  onReply: (message: ConversationMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, body: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  savingMessageId: string | null;
  deletingMessageId: string | null;
  members: ConversationListItem["members"];
  conversationType: ConversationListItem["type"] | null;
  highlightedMessageId: string | null;
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function MessageList({
  messages,
  currentUserId,
  isLoading,
  isOtherUserTyping,
  onReply,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  savingMessageId,
  deletingMessageId,
  members,
  conversationType,
  highlightedMessageId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedMessageId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherUserTyping, highlightedMessageId]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const target = document.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(highlightedMessageId)}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [messages, highlightedMessageId]);

  const lastOwnMessageId = [...messages]
    .reverse()
    .find((message) => message.sender?.id === currentUserId)?.id;

  if (isLoading) {
    return (
      <div className="grid h-full min-h-0 place-items-center text-sm text-muted-foreground">
        Loading messages…
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8">
      {messages.length === 0 ? (
        <div className="flex min-h-full flex-col items-center justify-center text-center">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle className="size-6" />
          </div>
          <h2 className="font-semibold">Start the conversation</h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            This is the beginning of your chat. Send a message to say hello.
          </p>
        </div>
      ) : (
        messages.map((message) => {
          const isOwnMessage = message.sender?.id === currentUserId;
          const readByCount = members.filter(
            (member) =>
              member.id !== currentUserId &&
              member.lastReadAt !== null &&
              new Date(member.lastReadAt).getTime() >=
                new Date(message.createdAt).getTime(),
          ).length;
          const replySenderName =
            message.replyTo?.sender?.displayName ?? "Original message";

          return (
            <article
              key={message.id}
              data-message-id={message.id}
              className={[
                "group flex items-end gap-2.5",
                isOwnMessage ? "justify-end" : "justify-start",
                message.id === highlightedMessageId
                  ? "rounded-2xl bg-primary/10 ring-2 ring-primary/30 transition-colors duration-500"
                  : "",
              ].join(" ")}
            >
              {!isOwnMessage && message.sender ? (
                <FriendsAvatar
                  name={message.sender.displayName}
                  avatarUrl={message.sender.avatarUrl}
                  size="sm"
                />
              ) : null}

              <div
                className={[
                  "flex min-w-0 max-w-[min(82%,38rem)] flex-col gap-1.5",
                  isOwnMessage ? "items-end" : "items-start",
                ].join(" ")}
              >
                {!isOwnMessage ? (
                  <p className="px-1 text-xs font-medium text-muted-foreground">
                    {message.sender?.displayName ?? "Former member"}
                  </p>
                ) : null}
                {isOwnMessage ? (
                  <MessageActionsMenu
                    message={message}
                    isSaving={savingMessageId === message.id}
                    isDeleting={deletingMessageId === message.id}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                  />
                ) : null}
                {message.replyTo && !message.body ? (
                  <div className="flex max-w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left">
                    <Reply className="size-3.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{replySenderName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {message.replyTo.body ?? "Attachment"}
                      </p>
                    </div>
                  </div>
                ) : null}

                <MessageAttachmentContent
                  attachments={message.attachments ?? []}
                />

                {message.body ? (
                  <div
                    className={[
                      "max-w-full rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                      isOwnMessage
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border bg-card text-card-foreground",
                    ].join(" ")}
                  >
                    {message.replyTo ? (
                      <div className="mb-2 rounded-lg border-l-2 border-current/40 bg-black/5 px-3 py-2 text-left">
                        <p className="text-xs font-semibold">
                          {replySenderName}
                        </p>
                        <p className="mt-0.5 max-w-64 truncate text-xs opacity-80">
                          {message.replyTo.body ?? "Image attachment"}
                        </p>
                      </div>
                    ) : null}

                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                  </div>
                ) : null}

                {message.reactions?.length ? (
                  <div
                    className={[
                      "flex flex-wrap gap-1",
                      isOwnMessage ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    <MessageReactionSummary
                      messageId={message.id}
                      reactions={message.reactions}
                      onToggleReaction={onToggleReaction}
                    />
                  </div>
                ) : null}

                <div className="flex items-center gap-1 px-1">
                  <time
                    dateTime={message.createdAt}
                    className="text-[10px] text-muted-foreground"
                  >
                    {formatTime(message.createdAt)}
                    {message.editedAt ? " · edited" : ""}
                  </time>
                  {isOwnMessage &&
                  conversationType !== "world" &&
                  message.id === lastOwnMessageId &&
                  readByCount > 0 ? (
                    <span className="text-[10px] font-medium text-primary">
                      {conversationType === "direct"
                        ? "Seen"
                        : `Seen by ${readByCount}`}
                    </span>
                  ) : null}
                  <MessageReactionPicker
                    onSelect={(emoji) => onToggleReaction(message.id, emoji)}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Reply to message"
                    title="Reply"
                    onClick={() => onReply(message)}
                    className="size-7 text-muted-foreground opacity-100 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    <Reply className="size-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })
      )}

      {isOtherUserTyping ? (
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className="flex h-8 items-center gap-1 rounded-2xl rounded-bl-md border bg-card px-3">
            <span className="size-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
            <span className="size-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
            <span className="size-1 animate-bounce rounded-full bg-muted-foreground" />
          </span>
          Someone is typing…
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
