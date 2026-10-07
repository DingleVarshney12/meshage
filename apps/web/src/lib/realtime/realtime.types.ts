import type { MessageReactionSummary } from "@/lib/api/conversations/conversations.types";

export interface ConversationJoinedEvent {
  conversationId: string;
}

export interface ConversationTypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface SocketErrorEvent {
  message: string;
}
export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface ConversationPresenceEvent {
  conversationId: string;
  users: UserPresence[];
}

export interface PresenceUpdateEvent extends UserPresence {
  conversationId: string;
}
export interface ConversationReactionEvent {
  conversationId: string;
  messageId: string;
  reactions: MessageReactionSummary[];
}

export interface ConversationMessageUpdatedEvent {
  conversationId: string;
  messageId: string;
  body: string;
  editedAt: string;
}

export interface ConversationMessageDeletedEvent {
  conversationId: string;
  messageId: string;
}
export interface ConversationReadUpdatedEvent {
  conversationId: string;
  userId: string;
  lastReadAt: string;
}
