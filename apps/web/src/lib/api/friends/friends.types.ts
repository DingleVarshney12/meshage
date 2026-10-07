export interface FriendUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export type FriendSearchResult = FriendUser;

export interface FriendRequest {
  id: string;
  status: "pending";
  createdAt: string;
  sender: FriendUser;
  receiver: FriendUser;
}

export interface FriendListItem extends FriendUser {
  friendsSince: string;
}

export interface SendFriendRequestInput {
  username: string;
}

export type FriendRequestDecision = "accept" | "reject";

export interface RespondFriendRequestInput {
  decision: FriendRequestDecision;
}

export interface FriendActionResponse {
  message: string;
  requestId?: string;
}
