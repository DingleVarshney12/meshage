import { Check, Clock3, UserRoundPlus, X } from "lucide-react";
import type { FriendRequest } from "@/lib/api/friends/friends.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FriendsAvatar } from "./friends-avatar";

interface FriendRequestsProps {
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  busyId: string | null;
  onRespond: (requestId: string, decision: "accept" | "reject") => void;
  onCancel: (requestId: string) => void;
}

export default function FriendRequests({
  incomingRequests,
  outgoingRequests,
  busyId,
  onRespond,
  onCancel,
}: FriendRequestsProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="border-0 shadow-sm ring-1 ring-border/70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Received requests</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              People who want to connect with you.
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserRoundPlus className="size-5" />
          </span>
        </CardHeader>

        <CardContent className="space-y-3">
          {incomingRequests.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No new requests right now.
            </p>
          ) : (
            incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border bg-background p-3"
              >
                <FriendsAvatar
                  name={request.sender.displayName}
                  avatarUrl={request.sender.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {request.sender.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{request.sender.username}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === request.id}
                    onClick={() => onRespond(request.id, "accept")}
                    className="rounded-xl"
                  >
                    <Check />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Reject request from ${request.sender.displayName}`}
                    disabled={busyId === request.id}
                    onClick={() => onRespond(request.id, "reject")}
                    className="rounded-xl"
                  >
                    <X />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-border/70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Sent requests</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Requests waiting for a reply.
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Clock3 className="size-5" />
          </span>
        </CardHeader>

        <CardContent className="space-y-3">
          {outgoingRequests.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              You don’t have any pending sent requests.
            </p>
          ) : (
            outgoingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 rounded-2xl border bg-background p-3"
              >
                <FriendsAvatar
                  name={request.receiver.displayName}
                  avatarUrl={request.receiver.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {request.receiver.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{request.receiver.username}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === request.id}
                  onClick={() => onCancel(request.id)}
                  className="rounded-xl"
                >
                  <X />
                  Cancel
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
