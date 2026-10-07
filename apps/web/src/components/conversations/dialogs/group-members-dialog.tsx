"use client";

import { useState } from "react";
import { LoaderCircle, UsersRound } from "lucide-react";

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
import {
  leaveGroup,
  removeGroupMember,
} from "@/lib/api/conversations/conversations.api";
import type { ConversationListMember } from "@/lib/api/conversations/conversations.types";
import { getErrorMessage } from "@/lib/utils/errors";
import { DialogMenuTrigger } from "./dialog-menu-trigger";

interface GroupMembersDialogProps {
  conversationId: string;
  members: ConversationListMember[];
  description: string | null;
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
  onChanged: () => void;
  onLeave: () => void;
  renderTrigger?: DialogMenuTrigger;
}

export default function GroupMembersDialog({
  conversationId,
  members,
  description,
  currentUserId,
  currentUserRole,
  onChanged,
  onLeave,
  renderTrigger,
}: GroupMembersDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [confirmingMemberId, setConfirmingMemberId] = useState<string | null>(
    null,
  );
  const [isLeaving, setIsLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(memberId: string) {
    if (confirmingMemberId !== memberId) {
      setConfirmingMemberId(memberId);
      setError(null);
      return;
    }

    setRemovingMemberId(memberId);
    setError(null);

    try {
      await removeGroupMember(conversationId, memberId);
      setConfirmingMemberId(null);
      onChanged();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleLeave() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      setError(null);
      return;
    }

    setIsLeaving(true);
    setError(null);

    try {
      await leaveGroup(conversationId);
      setIsOpen(false);
      onLeave();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLeaving(false);
    }
  }
  function openDialog() {
    setIsOpen(true);
    setError(null);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setError(null);
          setConfirmLeave(false);
          setConfirmingMemberId(null);
        }
      }}
    >
      {renderTrigger ? (
        renderTrigger(openDialog)
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="View group members"
          title="Group members"
          onClick={openDialog}
        >
          <UsersRound />
        </Button>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Group members</DialogTitle>
          <DialogDescription>
            {members.length} {members.length === 1 ? "member" : "members"}
          </DialogDescription>
        </DialogHeader>
        {description ? (
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              About this group
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">
              {description}
            </p>
          </div>
        ) : null}
        <div className="max-h-80 space-y-1 overflow-y-auto rounded-2xl border p-2">
          {members.map((member) => {
            const isOwner = member.role === "owner";
            const canRemove =
              currentUserRole === "owner" &&
              member.id !== currentUserId &&
              !isOwner;
            const isConfirming = confirmingMemberId === member.id;
            const isRemoving = removingMemberId === member.id;

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl p-2.5"
              >
                <FriendsAvatar
                  name={member.displayName}
                  avatarUrl={member.avatarUrl}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.displayName}
                    {member.id === currentUserId ? " (you)" : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{member.username}
                  </p>
                </div>

                {isOwner ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    Owner
                  </span>
                ) : null}

                {canRemove ? (
                  isConfirming ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isRemoving}
                        onClick={() => void handleRemove(member.id)}
                      >
                        {isRemoving ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingMemberId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemove(member.id)}
                    >
                      Remove
                    </Button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>

        {confirmLeave ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm">
            <p>
              Leave this group? If you are the owner, ownership will move to the
              longest-standing active member. If you are the last member, the
              group, messages, and uploaded media will be permanently deleted.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmLeave(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isLeaving}
                onClick={() => void handleLeave()}
              >
                {isLeaving ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  "Confirm leave"
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleLeave()}
            disabled={isLeaving}
          >
            Leave group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
