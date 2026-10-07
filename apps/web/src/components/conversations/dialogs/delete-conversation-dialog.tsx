"use client";

import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";

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
  clearConversationHistory,
  deleteConversation,
  deleteGroupForEveryone,
} from "@/lib/api/conversations/conversations.api";
import type { ConversationListItem } from "@/lib/api/conversations/conversations.types";
import { getErrorMessage } from "@/lib/utils/errors";
import { DialogMenuTrigger } from "./dialog-menu-trigger";

type ConversationHistoryAction = "remove" | "clear-history" | "delete-group";

interface DeleteConversationDialogProps {
  action: ConversationHistoryAction;
  conversationId: string;
  conversationType: ConversationListItem["type"] | null;
  currentUserRole: ConversationListItem["currentUserRole"] | null;
  onCompleted: () => void;
  renderTrigger?: DialogMenuTrigger;
}

export default function DeleteConversationDialog({
  action,
  conversationId,
  conversationType,
  currentUserRole,
  onCompleted,
  renderTrigger,
}: DeleteConversationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGroup = conversationType === "group";
  const isGroupDelete = action === "delete-group";
  const isHistoryClear = action === "clear-history";

  if (
    !conversationType ||
    (action === "remove" && conversationType !== "direct") ||
    (isHistoryClear &&
      conversationType !== "group" &&
      conversationType !== "world") ||
    (isGroupDelete && (!isGroup || currentUserRole !== "owner"))
  ) {
    return null;
  }

  async function handleAction() {
    setIsWorking(true);
    setError(null);

    try {
      if (action === "delete-group") {
        await deleteGroupForEveryone(conversationId);
      } else if (action === "clear-history") {
        await clearConversationHistory(conversationId);
      } else {
        await deleteConversation(conversationId);
      }

      setIsOpen(false);
      onCompleted();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsWorking(false);
    }
  }

  const title = isGroupDelete
    ? "Delete group for everyone?"
    : isHistoryClear
      ? "Clear your chat history?"
      : "Remove this chat?";
  const description = isGroupDelete
    ? "This permanently deletes the group, its messages, reactions, and uploaded media for everyone. This cannot be undone."
    : isHistoryClear
      ? "Only your history will be cleared. Other members will still have their messages, and new messages will appear here as usual."
      : "This removes the chat from your list and clears your history. The other person keeps their copy; future messages start a fresh history for you.";
  const actionLabel = isGroupDelete
    ? "Delete group for everyone"
    : isHistoryClear
      ? "Clear history for me"
      : "Remove chat for me";

  function openDialog() {
    setIsOpen(true);
    setError(null);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setError(null);
      }}
    >
      {renderTrigger ? (
        renderTrigger(openDialog)
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={actionLabel}
          title={actionLabel}
          onClick={openDialog}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isWorking}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleAction()}
            disabled={isWorking}
          >
            {isWorking ? (
              <>
                <LoaderCircle className="animate-spin" />
                {isGroupDelete ? "Deleting…" : "Working…"}
              </>
            ) : (
              actionLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
