"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createDirectConversation } from "@/lib/api/conversations/conversations.api";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  cancelFriendRequest,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/lib/api/friends/friends.api";
import type {
  FriendListItem,
  FriendRequest,
  FriendRequestDecision,
} from "@/lib/api/friends/friends.types";

import DiscoverPeople from "./discover-people";
import FriendRequests from "./friend-requests";
import FriendsList from "./friends-list";
import FriendsOverview from "./friends-overview";
import FriendsSidebar, { type FriendsSection } from "./friends-sidebar";

export default function FriendsPageClient() {
  const router = useRouter();

  const [activeSection, setActiveSection] =
    useState<FriendsSection>("overview");
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadFriendsData = useCallback(async () => {
    setError(null);

    try {
      const [friendList, incoming, outgoing] = await Promise.all([
        getFriends(),
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
      ]);

      setFriends(friendList);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch the signed-in user's friends and request lists on page entry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFriendsData();
  }, [loadFriendsData]);

  useEffect(() => {
    window.addEventListener("meshage:friends-changed", loadFriendsData);
    return () =>
      window.removeEventListener("meshage:friends-changed", loadFriendsData);
  }, [loadFriendsData]);

  async function runAction(
    id: string,
    action: () => Promise<{ message: string }>,
  ) {
    setBusyId(id);
    setError(null);
    setNotice(null);

    try {
      const response = await action();
      setNotice(response.message);
      await loadFriendsData();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleStartChat(friend: FriendListItem) {
    setBusyId(friend.id);
    setError(null);
    setNotice(null);

    try {
      const conversation = await createDirectConversation({
        userId: friend.id,
      });

      router.push(`/chat/${conversation.conversationId}`);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
      setBusyId(null);
    }
  }

  const friendIds = new Set(friends.map((friend) => friend.id));
  const outgoingRequestUserIds = new Set(
    outgoingRequests.map((request) => request.receiver.id),
  );

  const sectionTitle: Record<FriendsSection, string> = {
    overview: "Your community",
    friends: "My friends",
    requests: "Friend requests",
    discover: "Discover people",
  };

  const sectionDescription: Record<FriendsSection, string> = {
    overview: "A little space for the people who make Meshage feel like home.",
    friends: "Keep your favorite people close.",
    requests: "Manage invitations to connect with you.",
    discover: "Find someone new to start a conversation with.",
  };

  return (
    <main className="min-h-dvh bg-background p-3 text-foreground sm:p-6 lg:h-dvh lg:overflow-hidden lg:p-5">
      <div className="mx-auto flex max-w-375 flex-col gap-5 lg:h-full lg:max-w-none lg:flex-row lg:gap-5 lg:px-0">
        <FriendsSidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            setError(null);
            setNotice(null);
          }}
          friendsCount={friends.length}
          requestsCount={incomingRequests.length}
        />

        <section className="min-w-0 flex-1 lg:h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Meshage / Friends
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {sectionTitle[activeSection]}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {sectionDescription[activeSection]}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Refresh friends data"
                title="Refresh"
                onClick={() => void loadFriendsData()}
              >
                <RefreshCw />
              </Button>

              <Button variant="outline" size="sm" asChild>
                <Link href="/chat">
                  <ArrowLeft />
                  <MessageCircle />
                  Chats
                </Link>
              </Button>
            </div>
          </header>

          {error ? (
            <div
              role="alert"
              className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <p>{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadFriendsData()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {notice ? (
            <div
              role="status"
              className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
            >
              {notice}
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid min-h-80 place-items-center rounded-3xl border bg-card">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin text-primary" />
                Loading your community…
              </div>
            </div>
          ) : (
            <>
              {activeSection === "overview" ? (
                <FriendsOverview
                  friends={friends}
                  incomingRequests={incomingRequests}
                  onSectionChange={setActiveSection}
                />
              ) : null}

              {activeSection === "friends" ? (
                <FriendsList
                  friends={friends}
                  busyId={busyId}
                  onRemove={(friendId: string) =>
                    void runAction(friendId, () => removeFriend(friendId))
                  }
                  onStartChat={(friend: FriendListItem) =>
                    void handleStartChat(friend)
                  }
                />
              ) : null}

              {activeSection === "requests" ? (
                <FriendRequests
                  incomingRequests={incomingRequests}
                  outgoingRequests={outgoingRequests}
                  busyId={busyId}
                  onRespond={(
                    requestId: string,
                    decision: FriendRequestDecision,
                  ) =>
                    void runAction(requestId, () =>
                      respondToFriendRequest(requestId, decision),
                    )
                  }
                  onCancel={(requestId: string) =>
                    void runAction(requestId, () =>
                      cancelFriendRequest(requestId),
                    )
                  }
                />
              ) : null}

              {activeSection === "discover" ? (
                <DiscoverPeople
                  friendIds={friendIds}
                  outgoingRequestUserIds={outgoingRequestUserIds}
                  busyId={busyId}
                  onSendRequest={(username: string) =>
                    void runAction(username, () =>
                      sendFriendRequest({ username }),
                    )
                  }
                  onError={setError}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
