"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, LoaderCircle, UserRoundPlus } from "lucide-react";

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
import { getFriends } from "@/lib/api/friends/friends.api";
import { addGroupMembers } from "@/lib/api/conversations/conversations.api";
import type { FriendListItem } from "@/lib/api/friends/friends.types";
import { DialogMenuTrigger } from "./dialog-menu-trigger";
import { getErrorMessage } from "@/lib/utils/errors";

interface AddGroupMembersDialogProps {
  conversationId: string;
  existingMemberIds: string[];
  onAdded: () => void;
  renderTrigger?: DialogMenuTrigger;
}

export default function AddGroupMembersDialog({
  conversationId,
  existingMemberIds,
  onAdded,
  renderTrigger,
}: AddGroupMembersDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
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

  const availableFriends = friends.filter(
    (friend) => !existingMemberIds.includes(friend.id),
  );

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    if (!open) {
      setSelectedFriendIds([]);
      setError(null);
    }
  }

  function toggleFriend(friendId: string) {
    setSelectedFriendIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedFriendIds.length === 0) {
      setError("Select at least one friend.");
      return;
    }

    setIsAdding(true);

    try {
      await addGroupMembers(conversationId, {
        memberIds: selectedFriendIds,
      });

      handleOpenChange(false);
      onAdded();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsAdding(false);
    }
  }

  function openDialog() {
    setIsOpen(true);
    setError(null);
  }
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {renderTrigger ? (
        renderTrigger(openDialog)
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Add group members"
          title="Add members"
          onClick={openDialog}
        >
          <UserRoundPlus />
        </Button>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>
            Choose friends to add to this group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Your friends</p>
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
              ) : availableFriends.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  All your friends are already in this group.
                </p>
              ) : (
                availableFriends.map((friend) => {
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
              disabled={isAdding}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                isAdding || isLoadingFriends || selectedFriendIds.length === 0
              }
            >
              {isAdding ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Adding…
                </>
              ) : (
                "Add members"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
