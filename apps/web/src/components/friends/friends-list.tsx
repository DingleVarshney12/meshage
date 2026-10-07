import { ArrowUpRight, MessageCircle, UserMinus, Users } from "lucide-react";
import type { FriendListItem } from "@/lib/api/friends/friends.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FriendsAvatar } from "./friends-avatar";

interface FriendsListProps {
  friends: FriendListItem[];
  busyId: string | null;
  onRemove: (friendId: string) => void;
  onStartChat: (friend: FriendListItem) => void;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export default function FriendsList({
  friends,
  busyId,
  onRemove,
  onStartChat,
}: FriendsListProps) {
  if (friends.length === 0) {
    return (
      <Card className="border-dashed bg-card/70">
        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <h2 className="text-lg font-semibold">No friends yet</h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Discover people by username and start building your circle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {friends.map((friend) => (
        <Card
          key={friend.id}
          className="group overflow-hidden border-0 shadow-sm ring-1 ring-border/70 transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="h-20 bg-linear-to-r from-primary/15 via-primary/5 to-violet-400/10" />

          <CardContent className="-mt-9 p-5">
            <div className="flex items-end justify-between">
              <FriendsAvatar
                name={friend.displayName}
                avatarUrl={friend.avatarUrl}
                size="lg"
              />

              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove ${friend.displayName}`}
                title="Remove friend"
                disabled={busyId === friend.id}
                onClick={() => onRemove(friend.id)}
                className="mb-1 rounded-xl opacity-70 transition group-hover:opacity-100"
              >
                <UserMinus />
              </Button>
            </div>

            <div className="mt-3">
              <h2 className="truncate font-semibold">{friend.displayName}</h2>
              <p className="truncate text-sm text-muted-foreground">
                @{friend.username}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Friends since {formatDate(friend.friendsSince)}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                Connected <ArrowUpRight className="size-3.5" />
              </span>
            </div>

            <Button
              className="mt-4 w-full rounded-xl"
              disabled={busyId === friend.id}
              onClick={() => onStartChat(friend)}
            >
              <MessageCircle />
              {busyId === friend.id ? "Opening chat…" : "Message"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
