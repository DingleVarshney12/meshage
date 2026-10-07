import { apiRequest } from "../api-client";
import type {
  JoinWorldChatResponse,
  ConversationListItem,
  CreateDirectConversationInput,
  CreateDirectConversationResponse,
  GetConversationMessagesResponse,
  SendConversationMessageInput,
  ConversationMessage,
  CreateGroupConversationInput,
  CreateGroupConversationResponse,
  UpdateGroupSettingsInput,
  UpdateGroupSettingsResponse,
  AddGroupMembersInput,
  AddGroupMembersResponse,
  RemoveGroupMemberResponse,
  LeaveGroupResponse,
  DeleteConversationResponse,
  ToggleMessageReactionResponse,
  UpdateConversationMessageResponse,
  DeleteConversationMessageResponse,
  MarkConversationAsReadResponse,
  GroupAvatarResponse,
  SearchConversationMessagesResponse,
} from "./conversations.types";

export function getConversations() {
  return apiRequest<ConversationListItem[]>("/conversations");
}

export function createDirectConversation(input: CreateDirectConversationInput) {
  return apiRequest<CreateDirectConversationResponse>("/conversations/direct", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getConversationMessages(
  conversationId: string,
  options: { limit?: number; before?: string } = {},
) {
  const params = new URLSearchParams();

  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }

  if (options.before) {
    params.set("before", options.before);
  }

  const query = params.size > 0 ? `?${params.toString()}` : "";

  return apiRequest<GetConversationMessagesResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages${query}`,
  );
}

export function searchConversationMessages(
  conversationId: string,
  query: string,
) {
  const params = new URLSearchParams({ q: query });
  return apiRequest<SearchConversationMessagesResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/search?${params.toString()}`,
  );
}

export function getConversationMessageContext(
  conversationId: string,
  messageId: string,
) {
  return apiRequest<{ items: ConversationMessage[] }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/context`,
  );
}

export function sendConversationMessage(
  conversationId: string,
  input: SendConversationMessageInput,
) {
  const attachments = input.attachments ?? [];

  if (attachments.length === 0) {
    return apiRequest<ConversationMessage>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(input.body?.trim() ? { body: input.body.trim() } : {}),
          ...(input.replyToMessageId
            ? { replyToMessageId: input.replyToMessageId }
            : {}),
        }),
      },
    );
  }

  const formData = new FormData();

  if (input.body?.trim()) {
    formData.append("body", input.body.trim());
  }
  if (input.audioWaveform) {
    formData.append("audioWaveform", JSON.stringify(input.audioWaveform));
  }
  if (input.replyToMessageId) {
    formData.append("replyToMessageId", input.replyToMessageId);
  }

  for (const attachment of attachments) {
    formData.append("attachments", attachment);
  }

  return apiRequest<ConversationMessage>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: formData,
    },
  );
}
export function createGroupConversation(input: CreateGroupConversationInput) {
  return apiRequest<CreateGroupConversationResponse>("/conversations/group", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateGroupSettings(
  conversationId: string,
  input: UpdateGroupSettingsInput,
) {
  return apiRequest<UpdateGroupSettingsResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/group-settings`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}
export function addGroupMembers(
  conversationId: string,
  input: AddGroupMembersInput,
) {
  return apiRequest<AddGroupMembersResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/members`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function removeGroupMember(conversationId: string, memberId: string) {
  return apiRequest<RemoveGroupMemberResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" },
  );
}

export function leaveGroup(conversationId: string) {
  return apiRequest<LeaveGroupResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/leave`,
    { method: "POST" },
  );
}
export function deleteConversation(conversationId: string) {
  return apiRequest<DeleteConversationResponse>(
    `/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );
}
export function clearConversationHistory(conversationId: string) {
  return apiRequest<{ conversationId: string; clearedForMe: true }>(
    `/conversations/${encodeURIComponent(conversationId)}/history`,
    { method: "DELETE" },
  );
}
export function deleteGroupForEveryone(conversationId: string) {
  return apiRequest<DeleteConversationResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/everyone`,
    { method: "DELETE" },
  );
}
export function updateConversationMessage(
  conversationId: string,
  messageId: string,
  body: string,
) {
  return apiRequest<UpdateConversationMessageResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ body }),
    },
  );
}

export function deleteConversationMessage(
  conversationId: string,
  messageId: string,
) {
  return apiRequest<DeleteConversationMessageResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE",
    },
  );
}
export function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
) {
  return apiRequest<ToggleMessageReactionResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    },
  );
}

export function markConversationAsRead(conversationId: string) {
  return apiRequest<MarkConversationAsReadResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "POST" },
  );
}

export function joinWorldChat() {
  return apiRequest<JoinWorldChatResponse>("/conversations/world/join", {
    method: "POST",
  });
}
export function uploadGroupAvatar(conversationId: string, file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  return apiRequest<GroupAvatarResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/group-avatar`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function removeGroupAvatar(conversationId: string) {
  return apiRequest<GroupAvatarResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/group-avatar`,
    {
      method: "DELETE",
    },
  );
}
