"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Check, LoaderCircle, UserRoundGroup } from "lucide-react";

import { FriendsAvatar } from "@/components/friends/friends-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getFriends } from "@/lib/api/friends/friends.api";
import type { FriendListItem } from "@/lib/api/friends/friends.types";
import { createGroupConversation } from "@/lib/api/conversations/conversations.api";
import { getErrorMessage } from "@/lib/utils/errors";
interface CreateGroupDialogProps {
  onCreated: (conversationId: string) => void;
  renderTrigger?: (openDialog: () => void) => ReactNode;
}

export default function CreateGroupDialog({
  onCreated,
  renderTrigger,
}: CreateGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadFriends() {
      setIsLoadingFriends(true);
      setError(null);

      try {
        const items = await getFriends();

        if (!isCancelled) {
          setFriends(items);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingFriends(false);
        }
      }
    }

    void loadFriends();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  function toggleFriend(friendId: string) {
    setSelectedFriendIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    if (!open) {
      setTitle("");
      setSelectedFriendIds([]);
      setError(null);
    }
  }

  function openDialog() {
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedFriendIds.length === 0) {
      setError("Select at least one friend for the group.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await createGroupConversation({
        title: title.trim(),
        memberIds: selectedFriendIds,
      });

      handleOpenChange(false);
      onCreated(response.conversationId);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {renderTrigger ? (
        renderTrigger(openDialog)
      ) : (
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          onClick={openDialog}
        >
          <UserRoundGroup />
          New group
        </Button>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a group</DialogTitle>
          <DialogDescription>
            Give your group a name, then choose at least one friend.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Group name</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Weekend plans"
              maxLength={100}
              minLength={2}
              required
              className="h-11 rounded-xl"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Choose friends</p>
              <span className="text-xs text-muted-foreground">
                {selectedFriendIds.length} selected
              </span>
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border p-2">
              {isLoadingFriends ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading friends…
                </div>
              ) : friends.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Add friends before creating a group.
                </p>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedFriendIds.includes(friend.id);

                  return (
                    <button
                      key={friend.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleFriend(friend.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-accent",
                      ].join(" ")}
                    >
                      <FriendsAvatar
                        name={friend.displayName}
                        avatarUrl={friend.avatarUrl}
                        size="sm"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {friend.displayName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{friend.username}
                        </span>
                      </span>

                      <span
                        className={[
                          "grid size-5 place-items-center rounded-full border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-transparent",
                        ].join(" ")}
                      >
                        <Check className="size-3" />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                isCreating ||
                isLoadingFriends ||
                title.trim().length < 2 ||
                selectedFriendIds.length === 0
              }
            >
              {isCreating ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Creating…
                </>
              ) : (
                "Create group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
