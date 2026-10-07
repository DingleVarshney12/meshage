"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, MessageCircle, Radio } from "lucide-react";
import type { Socket } from "socket.io-client";

import { useAuth } from "@/components/auth/auth-provider";
import { FriendsAvatar } from "@/components/friends/friends-avatar";
import { Button } from "@/components/ui/button";
import type {
  ConversationListItem,
  ConversationMessage,
} from "@/lib/api/conversations/conversations.types";
import { createRealtimeSocket } from "@/lib/realtime/socket-client";
import type {
  ConversationPresenceEvent,
  ConversationReactionEvent,
  ConversationTypingEvent,
  PresenceUpdateEvent,
  SocketErrorEvent,
  ConversationMessageUpdatedEvent,
  ConversationMessageDeletedEvent,
  ConversationReadUpdatedEvent,
} from "@/lib/realtime/realtime.types";
import MessageComposer from "./messages/message-composer";
import MessageList from "./messages/message-list";
import ConversationActionsMenu from "./conversation-actions-menu";
import ConversationMessageSearch from "./messages/conversation-message-search";
import NotificationsBell from "@/components/notifications/notifications-bell";
import {
  getConversationMessages,
  getConversations,
  sendConversationMessage,
  toggleMessageReaction,
  updateConversationMessage,
  deleteConversationMessage,
  markConversationAsRead,
} from "@/lib/api/conversations/conversations.api";
import { getErrorMessage } from "@/lib/utils/errors";

interface ConversationPageClientProps {
  conversationId: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

function formatLastSeen(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return "Offline";
  }

  const date = new Date(lastSeenAt);

  if (Number.isNaN(date.getTime())) {
    return "Offline";
  }

  return `Last seen ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)}`;
}

function getConversationDisplay(
  conversation: ConversationListItem,
  currentUserId: string,
) {
  if (conversation.type === "direct") {
    const otherMember = conversation.members.find(
      (member) => member.id !== currentUserId,
    );

    return {
      name: otherMember?.displayName ?? "Direct conversation",
      avatarUrl: otherMember?.avatarUrl ?? null,
    };
  }

  return {
    name:
      conversation.title ??
      (conversation.type === "world" ? "World chat" : "Group chat"),
    avatarUrl: conversation.avatarUrl,
  };
}

export default function ConversationPageClient({
  conversationId,
}: ConversationPageClientProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [conversationType, setConversationType] = useState<
    ConversationListItem["type"] | null
  >(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    ConversationListItem["currentUserRole"] | null
  >(null);
  const [conversationDescription, setConversationDescription] = useState<
    string | null
  >(null);
  const [conversationTitle, setConversationTitle] = useState(
    "Loading conversation…",
  );
  const [conversationAvatarUrl, setConversationAvatarUrl] = useState<
    string | null
  >(null);
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [replyToMessage, setReplyToMessage] =
    useState<ConversationMessage | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null,
  );
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [otherUserPresence, setOtherUserPresence] = useState<{
    isOnline: boolean;
    lastSeenAt: string | null;
  } | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<
    ConversationListItem["members"]
  >([]);
  const appendMessage = useCallback((message: ConversationMessage) => {
    setMessages((currentMessages) => {
      if (currentMessages.some((current) => current.id === message.id)) {
        return currentMessages;
      }

      return [...currentMessages, message];
    });
  }, []);

  const loadConversationDetails = useCallback(async () => {
    try {
      const conversations = await getConversations();
      const conversation = conversations.find(
        (item) => item.id === conversationId,
      );

      if (!conversation) {
        router.replace("/chat");
        return;
      }
      setGroupMembers(conversation.members);
      setGroupMemberIds(conversation.members.map((member) => member.id));
      const display = getConversationDisplay(conversation, currentUserId);
      setConversationTitle(display.name);
      setConversationAvatarUrl(display.avatarUrl);
      setConversationType(conversation.type);
      setCurrentUserRole(conversation.currentUserRole);
      setConversationDescription(conversation.description);
    } catch (requestError) {
      setConversationTitle("Conversation");
      setError(getErrorMessage(requestError));
    }
  }, [conversationId, currentUserId, router]);

  const loadMessages = useCallback(
    async (replaceHistory = false) => {
      setError(null);

      try {
        const response = await getConversationMessages(conversationId, {
          limit: 50,
        });

        if (replaceHistory) {
          setMessages(response.items);
          return;
        }

        setMessages((currentMessages) => {
          const messagesById = new Map<string, ConversationMessage>();

          for (const message of response.items) {
            messagesById.set(message.id, message);
          }

          for (const message of currentMessages) {
            messagesById.set(message.id, message);
          }

          return [...messagesById.values()].sort(
            (first, second) =>
              new Date(first.createdAt).getTime() -
              new Date(second.createdAt).getTime(),
          );
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    // Load the selected conversation and its history from the API after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversationDetails();
  }, [loadConversationDetails]);

  useEffect(() => {
    // Initial message history is fetched asynchronously when the chat opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMessages();
  }, [loadMessages]);
  useEffect(() => {
    if (isLoading) {
      return;
    }

    function markAsReadWhenVisible() {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        void markConversationAsRead(conversationId).catch(() => {
          // Chat stays usable if the read marker request fails.
        });
      }
    }

    markAsReadWhenVisible();
    document.addEventListener("visibilitychange", markAsReadWhenVisible);
    window.addEventListener("focus", markAsReadWhenVisible);

    return () => {
      document.removeEventListener("visibilitychange", markAsReadWhenVisible);
      window.removeEventListener("focus", markAsReadWhenVisible);
    };
  }, [conversationId, isLoading]);

  useEffect(() => {
    const socket = createRealtimeSocket();
    socketRef.current = socket;
    // The connecting status mirrors the socket lifecycle for this conversation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConnectionStatus("connecting");

    function joinCurrentConversation() {
      socket.emit("conversation:join", { conversationId });
    }

    function handleNewMessage(message: ConversationMessage) {
      if (message.conversationId === conversationId) {
        appendMessage(message);
      }
      if (
        message.sender?.id !== user?.id &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        void markConversationAsRead(conversationId).catch(() => {
          // The next focus/visibility event will retry marking it as read.
        });
      }
    }
    function handleMessageUpdated(event: ConversationMessageUpdatedEvent) {
      if (event.conversationId !== conversationId) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === event.messageId
            ? {
                ...message,
                body: event.body,
                editedAt: event.editedAt,
              }
            : message,
        ),
      );
    }

    function handleMessageDeleted(event: ConversationMessageDeletedEvent) {
      if (event.conversationId !== conversationId) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== event.messageId),
      );

      setReplyToMessage((currentReply) =>
        currentReply?.id === event.messageId ? null : currentReply,
      );
    }
    function handleReactionUpdated(event: ConversationReactionEvent) {
      if (event.conversationId !== conversationId) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === event.messageId
            ? { ...message, reactions: event.reactions }
            : message,
        ),
      );
    }
    function handleTyping(event: ConversationTypingEvent) {
      if (
        event.conversationId !== conversationId ||
        event.userId === user?.id
      ) {
        return;
      }

      setIsOtherUserTyping(event.isTyping);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (event.isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherUserTyping(false);
        }, 2500);
      }
    }

    function handlePresenceSnapshot(event: ConversationPresenceEvent) {
      if (event.conversationId !== conversationId) {
        return;
      }
      setOnlineUserIds(
        event.users
          .filter((presence) => presence.isOnline)
          .map((presence) => presence.userId),
      );
      const otherUser = event.users.find(
        (presence) => presence.userId !== user?.id,
      );

      if (otherUser) {
        setOtherUserPresence({
          isOnline: otherUser.isOnline,
          lastSeenAt: otherUser.lastSeenAt,
        });
      }
    }

    function handlePresenceUpdate(event: PresenceUpdateEvent) {
      if (event.conversationId !== conversationId) {
        return;
      }

      setOnlineUserIds((currentIds) => {
        if (event.isOnline) {
          return currentIds.includes(event.userId)
            ? currentIds
            : [...currentIds, event.userId];
        }

        return currentIds.filter((id) => id !== event.userId);
      });

      if (event.userId === user?.id) {
        return;
      }

      setOtherUserPresence({
        isOnline: event.isOnline,
        lastSeenAt: event.lastSeenAt,
      });
    }
    function handleSocketError(event: SocketErrorEvent) {
      setError(event.message);
    }

    function handleConnect() {
      setConnectionStatus("connected");
    }

    function handleDisconnect() {
      setConnectionStatus("disconnected");
      setIsOtherUserTyping(false);
    }

    function handleConnectError() {
      setConnectionStatus("disconnected");
    }
    function handleMembersChanged(event: { conversationId: string }) {
      if (event.conversationId === conversationId) {
        void loadConversationDetails();
      }
    }
    function handleConversationDeleted(event: { conversationId: string }) {
      if (event.conversationId === conversationId) {
        router.replace("/chat");
      }
    }
    function handleReadUpdated(event: ConversationReadUpdatedEvent) {
      if (event.conversationId !== conversationId) {
        return;
      }

      setGroupMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === event.userId
            ? { ...member, lastReadAt: event.lastReadAt }
            : member,
        ),
      );
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("socket:ready", joinCurrentConversation);
    socket.on("conversation:message", handleNewMessage);
    socket.on("conversation:typing", handleTyping);
    socket.on("conversation:presence", handlePresenceSnapshot);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("conversation:members-changed", handleMembersChanged);
    socket.on("conversation:deleted", handleConversationDeleted);
    socket.on("socket:error", handleSocketError);
    socket.on("conversation:reaction", handleReactionUpdated);
    socket.on("conversation:message-updated", handleMessageUpdated);
    socket.on("conversation:message-deleted", handleMessageDeleted);
    socket.on("conversation:read-updated", handleReadUpdated);
    socket.connect();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("socket:ready", joinCurrentConversation);
      socket.off("conversation:message", handleNewMessage);
      socket.off("conversation:typing", handleTyping);
      socket.off("conversation:presence", handlePresenceSnapshot);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("socket:error", handleSocketError);
      socket.off("conversation:members-changed", handleMembersChanged);
      socket.off("conversation:deleted", handleConversationDeleted);
      socket.off("conversation:reaction", handleReactionUpdated);
      socket.off("conversation:message-updated", handleMessageUpdated);
      socket.off("conversation:message-deleted", handleMessageDeleted);
      socket.off("conversation:read-updated", handleReadUpdated);
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [
    appendMessage,
    conversationId,
    loadConversationDetails,
    router,
    user?.id,
  ]);

  async function handleSend(
    body: string,
    replyToMessageId?: string,
    attachments: File[] = [],
    audioWaveform?: number[],
  ) {
    setIsSending(true);
    setError(null);

    try {
      const message = await sendConversationMessage(conversationId, {
        ...(body.trim() ? { body: body.trim() } : {}),
        ...(replyToMessageId ? { replyToMessageId } : {}),
        attachments,
        ...(audioWaveform ? { audioWaveform } : {}),
      });

      appendMessage(message);
      setReplyToMessage(null);
    } catch (sendError) {
      setError(getErrorMessage(sendError));
      throw sendError;
    } finally {
      setIsSending(false);
    }
  }
  async function handleToggleReaction(messageId: string, emoji: string) {
    setError(null);

    try {
      const response = await toggleMessageReaction(
        conversationId,
        messageId,
        emoji,
      );

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === response.messageId
            ? { ...message, reactions: response.reactions }
            : message,
        ),
      );
    } catch (reactionError) {
      setError(getErrorMessage(reactionError));
    }
  }
  async function handleEditMessage(messageId: string, body: string) {
    setSavingMessageId(messageId);
    setError(null);

    try {
      const updated = await updateConversationMessage(
        conversationId,
        messageId,
        body,
      );

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === updated.messageId
            ? {
                ...message,
                body: updated.body,
                editedAt: updated.editedAt,
              }
            : message,
        ),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw requestError;
    } finally {
      setSavingMessageId(null);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    setDeletingMessageId(messageId);
    setError(null);

    try {
      await deleteConversationMessage(conversationId, messageId);

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== messageId),
      );

      setReplyToMessage((currentReply) =>
        currentReply?.id === messageId ? null : currentReply,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw requestError;
    } finally {
      setDeletingMessageId(null);
    }
  }
  function handleTyping(isTyping: boolean) {
    socketRef.current?.emit("conversation:typing", {
      conversationId,
      isTyping,
    });
  }

  const presenceLabel =
    otherUserPresence === null
      ? "Checking status…"
      : otherUserPresence.isOnline
        ? "Online"
        : formatLastSeen(otherUserPresence.lastSeenAt);

  return (
    <main className="h-[100dvh] overflow-hidden bg-background p-3 text-foreground sm:p-5">
      <section className="mx-auto flex h-full min-h-0 max-w-5xl flex-col overflow-hidden rounded-3xl border bg-card shadow-xl shadow-slate-900/5">
        <header className="flex items-center gap-3 border-b bg-background/90 px-4 py-3 sm:px-6">
          <Button
            variant="outline"
            size="icon"
            aria-label="Go back"
            onClick={() => router.back()}
          >
            <ArrowLeft />
          </Button>

          <FriendsAvatar
            name={conversationTitle}
            avatarUrl={conversationAvatarUrl}
            size="sm"
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">
              {conversationTitle}
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {conversationType === "group" || conversationType === "world" ? (
                <>
                  {onlineUserIds.length > 0 ? (
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                  ) : null}
                  {onlineUserIds.length >= 2
                    ? `${onlineUserIds.length} online`
                    : onlineUserIds.length === 1
                      ? "1 person online"
                      : "No one online"}
                </>
              ) : (
                <>
                  {otherUserPresence?.isOnline ? (
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                  ) : null}
                  {presenceLabel}
                </>
              )}
            </p>
          </div>

          <span
            className={[
              "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex",
              connectionStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-amber-500/10 text-amber-700",
            ].join(" ")}
          >
            {connectionStatus === "connected" ? (
              <span className="size-1.5 rounded-full bg-emerald-500" />
            ) : (
              <Radio className="size-3.5" />
            )}
            {connectionStatus === "connected"
              ? "Live"
              : connectionStatus === "connecting"
                ? "Connecting…"
                : "Reconnecting…"}
          </span>
          <ConversationActionsMenu
            conversationId={conversationId}
            conversationType={conversationType}
            currentUserRole={currentUserRole}
            currentUserId={user?.id ?? ""}
            title={conversationTitle}
            description={conversationDescription}
            avatarUrl={conversationAvatarUrl}
            memberIds={groupMemberIds}
            members={groupMembers}
            onGroupSettingsUpdated={(settings) => {
              setConversationTitle(settings.title ?? "Group chat");
              setConversationDescription(settings.description);
              setConversationAvatarUrl(settings.avatarUrl);
            }}
            onMembersChanged={() => void loadConversationDetails()}
            onDeleted={() => router.replace("/chat")}
            onHistoryCleared={() => {
              void loadConversationDetails();
              void loadMessages(true);
            }}
            onLeave={() => router.replace("/chat")}
          />
          <ConversationMessageSearch
            conversationId={conversationId}
            onSelect={(contextMessages, messageId) => {
              setMessages(contextMessages);
              setHighlightedMessageId(messageId);
              window.setTimeout(() => {
                setHighlightedMessageId((current) =>
                  current === messageId ? null : current,
                );
              }, 2200);
            }}
          />
          <NotificationsBell />
        </header>

        {error ? (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:mx-6"
          >
            <p>{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void loadConversationDetails();
                void loadMessages();
              }}
            >
              Retry
            </Button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            currentUserId={user?.id ?? ""}
            isLoading={isLoading}
            isOtherUserTyping={isOtherUserTyping}
            onReply={setReplyToMessage}
            onToggleReaction={handleToggleReaction}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            savingMessageId={savingMessageId}
            deletingMessageId={deletingMessageId}
            members={groupMembers}
            conversationType={conversationType}
            highlightedMessageId={highlightedMessageId}
          />
        </div>

        <MessageComposer
          isSending={isSending}
          replyTo={replyToMessage}
          onSend={handleSend}
          onTyping={handleTyping}
          onCancelReply={() => setReplyToMessage(null)}
        />

        <div className="flex items-center justify-center gap-1.5 pb-3 text-[10px] text-muted-foreground">
          <MessageCircle className="size-3" />
          {connectionStatus === "connected"
            ? "Realtime connection active"
            : "Messages still save through the API"}
          {isLoading ? <LoaderCircle className="size-3 animate-spin" /> : null}
        </div>
      </section>
    </main>
  );
}
