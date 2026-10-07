"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  getConversations,
  joinWorldChat,
} from "@/lib/api/conversations/conversations.api";
import type {
  ConversationListItem,
  ConversationMessage,
} from "@/lib/api/conversations/conversations.types";
import { createRealtimeSocket } from "@/lib/realtime/socket-client";
import { getErrorMessage } from "@/lib/utils/errors";
import ChatSidebarHeader from "./chat-sidebar-header";
import type {
  ConversationPresenceEvent,
  ConversationTypingEvent,
  PresenceUpdateEvent,
  UserPresence,
} from "@/lib/realtime/realtime.types";
import ConversationList from "./conversation-list";

function getConversationTitle(
  conversation: ConversationListItem,
  currentUserId: string,
) {
  if (conversation.type !== "direct") {
    return conversation.title ?? "Group chat";
  }

  return (
    conversation.members.find((member) => member.id !== currentUserId)
      ?.displayName ?? "Direct conversation"
  );
}
function clearTypingTimeouts(
  typingTimeouts: Map<string, ReturnType<typeof setTimeout>>,
) {
  for (const timeout of typingTimeouts.values()) {
    clearTimeout(timeout);
  }

  typingTimeouts.clear();
}
const SIDEBAR_HEADER_STORAGE_KEY = "meshage-chat-sidebar-header-collapsed";

function subscribeToSidebarHeaderPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("meshage-sidebar-header-preference", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("meshage-sidebar-header-preference", onChange);
  };
}

function getSidebarHeaderPreference() {
  try {
    return window.localStorage.getItem(SIDEBAR_HEADER_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function ChatPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const isSidebarHeaderCollapsed = useSyncExternalStore(
    subscribeToSidebarHeaderPreference,
    getSidebarHeaderPreference,
    () => false,
  );
  const [isJoiningWorld, setIsJoiningWorld] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const joinedConversationIdsRef = useRef(new Set<string>());
  const conversationIdsRef = useRef(new Set<string>());
  const typingTimeoutsRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const [typingByConversationId, setTypingByConversationId] = useState<
    Record<string, boolean>
  >({});
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<string, UserPresence>
  >({});
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const items = await getConversations();
      conversationIdsRef.current = new Set(items.map((item) => item.id));
      setConversations(items);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial conversation data is fetched from the API after this client view mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const joinedConversationIds = joinedConversationIdsRef.current;
    const socket = createRealtimeSocket();
    socketRef.current = socket;

    function handleSocketReady() {
      setIsSocketReady(true);
    }

    function handleDisconnect() {
      setIsSocketReady(false);
      const joinedConversationIds = joinedConversationIdsRef.current;
      joinedConversationIds.clear();
      setTypingByConversationId({});
      clearTypingTimeouts(typingTimeoutsRef.current);
      setPresenceByUserId({});
      setTypingByConversationId({});
      clearTypingTimeouts(typingTimeoutsRef.current);
    }
    function handlePresenceSnapshot(event: ConversationPresenceEvent) {
      setPresenceByUserId((current) => {
        const next = { ...current };

        for (const presence of event.users) {
          next[presence.userId] = presence;
        }

        return next;
      });
    }
    function handleMessageChanged() {
      void loadConversations();
    }
    function handlePresenceUpdate(event: PresenceUpdateEvent) {
      setPresenceByUserId((current) => ({
        ...current,
        [event.userId]: {
          userId: event.userId,
          isOnline: event.isOnline,
          lastSeenAt: event.lastSeenAt,
        },
      }));
    }
    function handleTypingEvent(event: ConversationTypingEvent) {
      if (event.userId === user?.id) {
        return;
      }

      const existingTimeout = typingTimeoutsRef.current.get(
        event.conversationId,
      );

      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutsRef.current.delete(event.conversationId);
      }

      setTypingByConversationId((current) => ({
        ...current,
        [event.conversationId]: event.isTyping,
      }));

      if (event.isTyping) {
        const timeout = setTimeout(() => {
          typingTimeoutsRef.current.delete(event.conversationId);
          setTypingByConversationId((current) => ({
            ...current,
            [event.conversationId]: false,
          }));
        }, 3500);

        typingTimeoutsRef.current.set(event.conversationId, timeout);
      }
    }
    function handleIncomingMessage(message: ConversationMessage) {
      if (!conversationIdsRef.current.has(message.conversationId)) {
        void loadConversations();
        return;
      }

      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.id === message.conversationId
              ? {
                  ...conversation,
                  updatedAt: message.createdAt,
                  lastMessage: message,
                  unreadCount:
                    conversation.unreadCount +
                    (message.sender?.id === user?.id ? 0 : 1),
                }
              : conversation,
          )
          .sort(
            (first, second) =>
              new Date(second.updatedAt).getTime() -
              new Date(first.updatedAt).getTime(),
          ),
      );
    }
    function handleConversationCreated() {
      void loadConversations();
    }
    function handleConversationMembersChanged() {
      void loadConversations();
    }
    socket.on("socket:ready", handleSocketReady);
    socket.on("disconnect", handleDisconnect);
    socket.on("conversation:presence", handlePresenceSnapshot);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("conversation:typing", handleTypingEvent);
    socket.on("conversation:message", handleIncomingMessage);
    socket.on("conversation:created", handleConversationCreated);
    socket.on("conversation:members-changed", handleConversationMembersChanged);
    socket.on("conversation:deleted", handleConversationMembersChanged);
    socket.on("conversation:message-updated", handleMessageChanged);
    socket.on("conversation:read-updated", handleMessageChanged);
    socket.on("conversation:message-deleted", handleMessageChanged);
    socket.connect();

    return () => {
      socket.off("socket:ready", handleSocketReady);
      socket.off("disconnect", handleDisconnect);
      socket.off("conversation:presence", handlePresenceSnapshot);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("conversation:typing", handleTypingEvent);
      socket.off("conversation:message", handleIncomingMessage);
      socket.off("conversation:created", handleConversationCreated);
      socket.off("conversation:message-updated", handleMessageChanged);
      socket.off("conversation:read-updated", handleMessageChanged);
      socket.off("conversation:message-deleted", handleMessageChanged);
      socket.off(
        "conversation:members-changed",
        handleConversationMembersChanged,
      );
      socket.off("conversation:deleted", handleConversationMembersChanged);
      socket.disconnect();

      joinedConversationIds.clear();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [loadConversations, user?.id]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!isSocketReady || !socket) {
      return;
    }

    for (const conversation of conversations) {
      if (joinedConversationIdsRef.current.has(conversation.id)) {
        continue;
      }

      joinedConversationIdsRef.current.add(conversation.id);
      socket.emit("conversation:join", {
        conversationId: conversation.id,
      });
    }
  }, [conversations, isSocketReady]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const title = getConversationTitle(conversation, user?.id ?? "");
      const lastMessage = conversation.lastMessage?.body ?? "";

      return `${title} ${lastMessage}`.toLowerCase().includes(query);
    });
  }, [conversations, search, user?.id]);
  function toggleSidebarHeader() {
    const next = !getSidebarHeaderPreference();
    try {
      window.localStorage.setItem(SIDEBAR_HEADER_STORAGE_KEY, String(next));
      window.dispatchEvent(new Event("meshage-sidebar-header-preference"));
    } catch {
      // The header still works if browser storage is unavailable.
    }
  }
  const worldConversation = conversations.find(
    (conversation) => conversation.type === "world",
  );

  async function handleJoinWorldChat() {
    setIsJoiningWorld(true);
    setError(null);

    try {
      if (worldConversation) {
        router.push(`/chat/${worldConversation.id}`);
        return;
      }

      const result = await joinWorldChat();
      await loadConversations();
      router.push(`/chat/${result.conversationId}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsJoiningWorld(false);
    }
  }
  return (
    <main className="min-h-dvh bg-background p-3 text-foreground sm:p-5 lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:h-full lg:flex-row lg:gap-5">
        <aside className="flex min-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-xl shadow-slate-900/5 sm:min-h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:w-[390px] lg:shrink-0">
          <ChatSidebarHeader
            isCollapsed={isSidebarHeaderCollapsed}
            onToggle={toggleSidebarHeader}
            search={search}
            onSearchChange={setSearch}
            conversationCount={conversations.length}
            hasWorldChat={Boolean(worldConversation)}
            isJoiningWorld={isJoiningWorld}
            onJoinWorldChat={handleJoinWorldChat}
            onGroupCreated={(conversationId) =>
              router.push(`/chat/${conversationId}`)
            }
          />

          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <div>
              <p className="text-sm font-semibold">Recent</p>
              <p className="text-xs text-muted-foreground">
                {conversations.length}{" "}
                {conversations.length === 1 ? "conversation" : "conversations"}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh conversations"
              title="Refresh"
              onClick={() => void loadConversations()}
              disabled={isLoading}
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
            <ConversationList
              conversations={filteredConversations}
              currentUserId={user?.id ?? ""}
              presenceByUserId={presenceByUserId}
              isLoading={isLoading}
              error={error}
              onRetry={() => void loadConversations()}
              typingByConversationId={typingByConversationId}
            />
          </div>

          <footer className="border-t bg-background/60 px-5 py-3 text-xs text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {user?.displayName ?? "Meshage user"}
            </span>
          </footer>
        </aside>

        <section className="relative hidden min-w-0 flex-1 overflow-hidden rounded-3xl border bg-card shadow-xl shadow-slate-900/5 lg:grid lg:h-full lg:place-items-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(73,104,232,0.14),transparent_42%),radial-gradient(ellipse_at_bottom_left,rgba(91,145,255,0.10),transparent_38%)]" />

          <div className="relative mx-auto max-w-xl px-8 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-[1.75rem] border bg-background/80 text-primary shadow-xl shadow-primary/10">
              <MessageCircle className="size-9" />
            </div>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />A little more
              connected
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              Good conversations
              <br />
              start with a hello.
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Choose a conversation to pick up where you left off, or find a
              friend and start a new one.
            </p>

            <Button asChild className="mt-6 rounded-xl">
              <Link href="/friends">
                Find people to chat with
                <ArrowUpRight />
              </Link>
            </Button>
          </div>

          <div className="absolute bottom-6 right-7 hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            Private conversations are just a click away
          </div>
        </section>
      </div>
    </main>
  );
}
