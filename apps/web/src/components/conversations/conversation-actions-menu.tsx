"use client";

import { useRef } from "react";
import {
  MoreHorizontal,
  MessageSquareOff,
  Settings2,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConversationListItem } from "@/lib/api/conversations/conversations.types";
import AddGroupMembersDialog from "./dialogs/add-group-members-dialog";
import DeleteConversationDialog from "./dialogs/delete-conversation-dialog";
import GroupMembersDialog from "./dialogs/group-members-dialog";
import GroupSettingsDialog from "./dialogs/group-settings-dialog";

interface ConversationActionsMenuProps {
  conversationId: string;
  conversationType: ConversationListItem["type"] | null;
  currentUserRole: ConversationListItem["currentUserRole"] | null;
  currentUserId: string;
  title: string;
  description: string | null;
  avatarUrl: string | null;
  memberIds: string[];
  members: ConversationListItem["members"];
  onGroupSettingsUpdated: (settings: {
    title: string | null;
    description: string | null;
    avatarUrl: string | null;
  }) => void;
  onMembersChanged: () => void;
  onDeleted: () => void;
  onHistoryCleared: () => void;
  onLeave: () => void;
}

export default function ConversationActionsMenu({
  conversationId,
  conversationType,
  currentUserRole,
  currentUserId,
  title,
  description,
  avatarUrl,
  memberIds,
  members,
  onGroupSettingsUpdated,
  onMembersChanged,
  onDeleted,
  onHistoryCleared,
  onLeave,
}: ConversationActionsMenuProps) {
  const openGroupSettingsRef = useRef<(() => void) | null>(null);
  const openAddMembersRef = useRef<(() => void) | null>(null);
  const openMembersRef = useRef<(() => void) | null>(null);
  const openRemoveChatRef = useRef<(() => void) | null>(null);
  const openClearHistoryRef = useRef<(() => void) | null>(null);
  const openDeleteGroupRef = useRef<(() => void) | null>(null);

  if (!conversationType) {
    return null;
  }

  const isGroup = conversationType === "group";
  const isWorld = conversationType === "world";
  const isOwner = currentUserRole === "owner";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open conversation actions"
            title="More"
            className="rounded-xl"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {isGroup
              ? "Group actions"
              : isWorld
                ? "World chat"
                : "Chat actions"}
          </DropdownMenuLabel>

          {isGroup && isOwner ? (
            <DropdownMenuItem onSelect={() => openGroupSettingsRef.current?.()}>
              <Settings2 />
              Group settings
            </DropdownMenuItem>
          ) : null}

          {isGroup && isOwner ? (
            <DropdownMenuItem onSelect={() => openAddMembersRef.current?.()}>
              <UserRoundPlus />
              Add members
            </DropdownMenuItem>
          ) : null}

          {isGroup ? (
            <DropdownMenuItem onSelect={() => openMembersRef.current?.()}>
              <UsersRound />
              View members
            </DropdownMenuItem>
          ) : null}

          {isGroup || isWorld ? (
            <DropdownMenuItem onSelect={() => openClearHistoryRef.current?.()}>
              <MessageSquareOff />
              Clear history for me
            </DropdownMenuItem>
          ) : null}

          {conversationType === "direct" ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => openRemoveChatRef.current?.()}
              >
                <Trash2 />
                Remove chat for me
              </DropdownMenuItem>
            </>
          ) : null}

          {isGroup && isOwner ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => openDeleteGroupRef.current?.()}
              >
                <Trash2 />
                Delete group for everyone
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {isGroup && isOwner ? (
        <GroupSettingsDialog
          conversationId={conversationId}
          title={title}
          description={description}
          avatarUrl={avatarUrl}
          onUpdated={onGroupSettingsUpdated}
          renderTrigger={(openDialog) => {
            openGroupSettingsRef.current = openDialog;
            return null;
          }}
        />
      ) : null}

      {isGroup && isOwner ? (
        <AddGroupMembersDialog
          conversationId={conversationId}
          existingMemberIds={memberIds}
          onAdded={onMembersChanged}
          renderTrigger={(openDialog) => {
            openAddMembersRef.current = openDialog;
            return null;
          }}
        />
      ) : null}

      {isGroup ? (
        <GroupMembersDialog
          conversationId={conversationId}
          members={members}
          description={description}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole ?? "member"}
          onChanged={onMembersChanged}
          onLeave={onLeave}
          renderTrigger={(openDialog) => {
            openMembersRef.current = openDialog;
            return null;
          }}
        />
      ) : null}

      <DeleteConversationDialog
        action="remove"
        conversationId={conversationId}
        conversationType={conversationType}
        currentUserRole={currentUserRole}
        onCompleted={onDeleted}
        renderTrigger={(openDialog) => {
          openRemoveChatRef.current = openDialog;
          return null;
        }}
      />

      <DeleteConversationDialog
        action="clear-history"
        conversationId={conversationId}
        conversationType={conversationType}
        currentUserRole={currentUserRole}
        onCompleted={onHistoryCleared}
        renderTrigger={(openDialog) => {
          openClearHistoryRef.current = openDialog;
          return null;
        }}
      />

      <DeleteConversationDialog
        action="delete-group"
        conversationId={conversationId}
        conversationType={conversationType}
        currentUserRole={currentUserRole}
        onCompleted={onDeleted}
        renderTrigger={(openDialog) => {
          openDeleteGroupRef.current = openDialog;
          return null;
        }}
      />
    </>
  );
}
