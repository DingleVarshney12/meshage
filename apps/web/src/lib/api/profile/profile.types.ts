export type ProfileVisibility = "public" | "private";

export interface UpdateProfileInput {
  displayName: string;
  bio: string | null;
  profileVisibility: ProfileVisibility;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  profileVisibility: ProfileVisibility;
}
