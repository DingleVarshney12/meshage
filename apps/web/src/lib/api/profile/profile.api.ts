import { apiRequest } from "../api-client";
import type {
  UpdateProfileInput,
  UpdateProfileResponse,
} from "./profile.types";

export function updateProfile(input: UpdateProfileInput) {
  return apiRequest<UpdateProfileResponse>("/profile/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function uploadProfileAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  return apiRequest<UpdateProfileResponse>("/profile/me/avatar", {
    method: "POST",
    body: formData,
  });
}

export function removeProfileAvatar() {
  return apiRequest<UpdateProfileResponse>("/profile/me/avatar", {
    method: "DELETE",
  });
}
