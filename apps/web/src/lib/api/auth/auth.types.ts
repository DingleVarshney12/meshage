export interface AuthResponse {
  user: AuthUser;
}

export interface SignupInput {
  recaptchaToken: string;
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface LoginInput {
  recaptchaToken: string;
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  recaptchaToken: string;
  idToken: string;
}

export interface EmailInput {
  recaptchaToken: string;
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
