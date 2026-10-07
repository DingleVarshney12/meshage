import { apiRequest } from "../api-client";
import type {
  FriendActionResponse,
  FriendListItem,
  FriendRequest,
  FriendRequestDecision,
  FriendSearchResult,
  SendFriendRequestInput,
} from "./friends.types";

export function searchUsers(query: string) {
  const params = new URLSearchParams({ query });

  return apiRequest<FriendSearchResult[]>(
    `/friends/search?${params.toString()}`,
  );
}

export function sendFriendRequest(input: SendFriendRequestInput) {
  return apiRequest<FriendActionResponse>("/friends/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getIncomingFriendRequests() {
  return apiRequest<FriendRequest[]>("/friends/requests/incoming");
}

export function getOutgoingFriendRequests() {
  return apiRequest<FriendRequest[]>("/friends/requests/outgoing");
}

export function respondToFriendRequest(
  requestId: string,
  decision: FriendRequestDecision,
) {
  return apiRequest<FriendActionResponse>(
    `/friends/requests/${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    },
  );
}

export function cancelFriendRequest(requestId: string) {
  return apiRequest<FriendActionResponse>(
    `/friends/requests/${encodeURIComponent(requestId)}`,
    {
      method: "DELETE",
    },
  );
}

export function getFriends() {
  return apiRequest<FriendListItem[]>("/friends");
}

export function removeFriend(friendUserId: string) {
  return apiRequest<FriendActionResponse>(
    `/friends/${encodeURIComponent(friendUserId)}`,
    {
      method: "DELETE",
    },
  );
}
