import {
  ArrowRight,
  Clock3,
  Sparkles,
  UserRoundPlus,
  Users,
} from "lucide-react";
import type {
  FriendListItem,
  FriendRequest,
} from "@/lib/api/friends/friends.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FriendsAvatar } from "./friends-avatar";
import type { FriendsSection } from "./friends-sidebar";

interface FriendsOverviewProps {
  friends: FriendListItem[];
  incomingRequests: FriendRequest[];
  onSectionChange: (section: FriendsSection) => void;
}

export default function FriendsOverview({
  friends,
  incomingRequests,
  onSectionChange,
}: FriendsOverviewProps) {
  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-primary via-[#5275ee] to-[#7458df] px-6 py-8 text-white shadow-xl shadow-primary/20 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-24 -z-10 size-72 rounded-full border-36 border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 -z-10 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute right-14 top-12 hidden size-28 rounded-full border border-white/20 sm:block" />

        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
            <Sparkles className="size-3.5" />
            Your people, your space
          </div>

          <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Make room for more good conversations.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
            Find your people, manage your connections, and keep the conversation
            going.
          </p>

          <Button
            variant="secondary"
            className="mt-6 rounded-xl bg-white text-primary hover:bg-white/90"
            onClick={() => onSectionChange("discover")}
          >
            <UserRoundPlus />
            Find people
            <ArrowRight className="ml-1" />
          </Button>
        </div>

        {friends.length > 0 ? (
          <div className="relative mt-8 flex items-center gap-3 border-t border-white/20 pt-5">
            <div className="flex -space-x-3">
              {friends.slice(0, 4).map((friend) => (
                <FriendsAvatar
                  key={friend.id}
                  name={friend.displayName}
                  avatarUrl={friend.avatarUrl}
                  size="default"
                />
              ))}
            </div>
            <p className="text-xs text-white/75">
              Your circle has{" "}
              <span className="font-semibold text-white">{friends.length}</span>{" "}
              {friends.length === 1 ? "friend" : "friends"}
            </p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-semibold tracking-tight">
                {friends.length}
              </p>
              <p className="text-sm text-muted-foreground">
                People in your circle
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="View friends"
              onClick={() => onSectionChange("friends")}
            >
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Clock3 className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-semibold tracking-tight">
                {incomingRequests.length}
              </p>
              <p className="text-sm text-muted-foreground">
                Requests to respond to
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="View requests"
              onClick={() => onSectionChange("requests")}
            >
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Your circle
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Recently connected
            </h2>
          </div>
          {friends.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSectionChange("friends")}
            >
              View all <ArrowRight />
            </Button>
          ) : null}
        </div>

        {friends.length === 0 ? (
          <Card className="border-dashed bg-card/70">
            <CardContent className="flex flex-col items-center px-6 py-10 text-center">
              <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Users className="size-6" />
              </div>
              <h3 className="font-semibold">Your circle starts here</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Find someone by username and send your first friend request.
              </p>
              <Button
                className="mt-4 rounded-xl"
                onClick={() => onSectionChange("discover")}
              >
                <UserRoundPlus />
                Discover people
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {friends.slice(0, 3).map((friend) => (
              <Card
                key={friend.id}
                className="border-0 shadow-sm ring-1 ring-border/70 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <FriendsAvatar
                    name={friend.displayName}
                    avatarUrl={friend.avatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {friend.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{friend.username}
                    </p>
                  </div>
                  <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
