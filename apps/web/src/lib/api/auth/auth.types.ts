export interface AuthResponse {
  user: AuthUser;
}

export interface SignupInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
}

export interface EmailInput {
  email: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileVisibility?: "public" | "private";
}
