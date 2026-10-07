"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search, UserPlus, Users } from "lucide-react";
import type { FriendSearchResult } from "@/lib/api/friends/friends.types";
import { searchUsers } from "@/lib/api/friends/friends.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FriendsAvatar } from "./friends-avatar";
import { getErrorMessage } from "@/lib/utils/errors";

interface DiscoverPeopleProps {
  friendIds: Set<string>;
  outgoingRequestUserIds: Set<string>;
  busyId: string | null;
  onSendRequest: (username: string) => void;
  onError: (message: string) => void;
}

export default function DiscoverPeople({
  friendIds,
  outgoingRequestUserIds,
  busyId,
  onSendRequest,
  onError,
}: DiscoverPeopleProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const normalizedUsername = query.trim().toLowerCase();
  const canRequestExactUsername = /^[a-z0-9_]{3,30}$/.test(normalizedUsername);
  const exactPublicResultExists = results.some(
    (person) => person.username.toLowerCase() === normalizedUsername,
  );
  const exactRequestAlreadyPending = results.some(
    (person) =>
      person.username.toLowerCase() === normalizedUsername &&
      outgoingRequestUserIds.has(person.id),
  );

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    let isCurrentSearch = true;

    const timeoutId = window.setTimeout(async () => {
      try {
        const users = await searchUsers(normalizedQuery);

        if (isCurrentSearch) {
          setResults(users);
        }
      } catch (error) {
        if (isCurrentSearch) {
          onError(getErrorMessage(error, "Could not search users."));
          setResults([]);
        }
      } finally {
        if (isCurrentSearch) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, onError]);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/70">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-violet-400/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Search className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold tracking-tight">Find your people</h2>
              <p className="text-sm text-muted-foreground">
                Search Meshage by username.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (nextQuery.trim().length < 2) {
                  setResults([]);
                  setIsSearching(false);
                } else {
                  setIsSearching(true);
                }
              }}
              placeholder="Try a username…"
              autoComplete="off"
              className="h-12 rounded-xl pl-10 pr-11"
            />
            {isSearching ? (
              <LoaderCircle className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Public profiles appear in search. If you know someone’s exact
            username, you can send them a request even if their private profile
            is hidden.
          </p>
        </CardContent>
      </Card>

      {query.trim().length < 2 ? (
        <div className="rounded-3xl border border-dashed bg-card/50 px-6 py-12 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <h3 className="font-semibold">Your next good chat is out there</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Search for a public profile, or enter a known username to send a
            request directly.
          </p>
        </div>
      ) : null}

      {results.length === 0 && !isSearching && query.trim().length >= 2 ? (
        <div className="rounded-3xl border border-dashed bg-card/50 px-6 py-10 text-center">
          <h3 className="font-semibold">No public profiles found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Private profiles stay hidden from search. If you know the exact
            username, you can still send a request.
          </p>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((person) => {
            const isFriend = friendIds.has(person.id);
            const requestPending = outgoingRequestUserIds.has(person.id);

            return (
              <Card
                key={person.id}
                className="border-0 shadow-sm ring-1 ring-border/70 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <FriendsAvatar
                    name={person.displayName}
                    avatarUrl={person.avatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {person.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{person.username}
                    </p>
                  </div>

                  {isFriend ? (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Friends
                    </span>
                  ) : requestPending ? (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Pending
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busyId === person.username}
                      onClick={() => onSendRequest(person.username)}
                      className="rounded-xl"
                    >
                      {busyId === person.username ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <UserPlus />
                      )}
                      Add
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {canRequestExactUsername && !exactPublicResultExists ? (
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Try requesting a known username
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                @{normalizedUsername}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This does not confirm the account exists. We check when you send
                the request.
              </p>
            </div>

            {exactRequestAlreadyPending ? (
              <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
                Request pending
              </span>
            ) : (
              <Button
                size="sm"
                disabled={busyId === normalizedUsername}
                onClick={() => onSendRequest(normalizedUsername)}
                className="rounded-xl"
              >
                {busyId === normalizedUsername ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <UserPlus />
                )}
                Send request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
