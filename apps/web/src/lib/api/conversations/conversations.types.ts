export type ConversationType = "direct" | "group" | "world";

export interface CreateDirectConversationInput {
  userId: string;
}

export interface CreateDirectConversationResponse {
  conversationId: string;
  type: "direct";
  created: boolean;
}

export interface ConversationMessageSender {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ConversationMessageReply {
  id: string;
  body: string | null;
  sender: ConversationMessageSender | null;
}
export interface ConversationMessageAttachment {
  id: string;
  type: "image" | "video" | "audio" | "file";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  waveform: number[] | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  type: "text" | "media" | "system";
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  sender: ConversationMessageSender | null;
  replyTo: ConversationMessageReply | null;
  attachments: ConversationMessageAttachment[];
  reactions: MessageReactionSummary[];
}

export interface GetConversationMessagesResponse {
  items: ConversationMessage[];
  hasMore: boolean;
}
export interface SearchConversationMessagesResponse {
  items: ConversationMessage[];
}
export interface SendConversationMessageInput {
  body?: string;
  replyToMessageId?: string;
  attachments?: File[];
  audioWaveform?: number[];
}
export interface ConversationListMember {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member";
  lastReadAt: string | null;
}

export interface ConversationListItem {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
  updatedAt: string;
  lastReadAt: string | null;
  members: ConversationListMember[];
  lastMessage: ConversationMessage | null;
  currentUserRole: "owner" | "admin" | "member";
  unreadCount: number;
}
export interface CreateGroupConversationInput {
  title: string;
  memberIds: string[];
}

export interface CreateGroupConversationResponse {
  conversationId: string;
  type: "group";
  created: boolean;
}
export interface UpdateGroupSettingsInput {
  title?: string;
  description?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateGroupSettingsResponse {
  conversationId: string;
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
}
export interface AddGroupMembersInput {
  memberIds: string[];
}

export interface AddGroupMembersResponse {
  conversationId: string;
  addedMemberIds: string[];
}

export interface RemoveGroupMemberResponse {
  conversationId: string;
  removedMemberId: string;
}

export interface LeaveGroupResponse {
  conversationId: string;
  left: true;
  newOwnerId: string | null;
  groupDeleted: boolean;
}
export interface DeleteConversationResponse {
  conversationId: string;
  deletedForAll: boolean;
}
export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ToggleMessageReactionResponse {
  conversationId: string;
  messageId: string;
  reactions: MessageReactionSummary[];
}

export interface JoinWorldChatResponse {
  conversationId: string;
  joined: boolean;
}

export interface UpdateConversationMessageResponse {
  conversationId: string;
  messageId: string;
  body: string;
  editedAt: string;
}

export interface DeleteConversationMessageResponse {
  conversationId: string;
  messageId: string;
  deletedForEveryone: true;
}

export interface MarkConversationAsReadResponse {
  conversationId: string;
  userId: string;
  lastReadAt: string;
}
export interface GroupAvatarResponse {
  conversationId: string;
  avatarUrl: string | null;
}
