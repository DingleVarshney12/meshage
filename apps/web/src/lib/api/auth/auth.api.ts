import { apiRequest } from "../api-client";
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordInput,
  EmailInput,
  GoogleLoginInput,
  LoginInput,
  MessageResponse,
  ResetPasswordInput,
  SignupInput,
  VerifyEmailInput,
} from "./auth.types";

async function post<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function signup(input: SignupInput) {
  return post<AuthResponse & MessageResponse, SignupInput>(
    "/auth/signup",
    input,
  );
}

export function verifyEmail(input: VerifyEmailInput) {
  return post<MessageResponse, VerifyEmailInput>("/auth/verify-email", input);
}

export function resendVerificationEmail(input: EmailInput) {
  return post<MessageResponse, EmailInput>("/auth/resend-verification", input);
}

export function loginWithEmail(input: LoginInput) {
  return post<AuthResponse, LoginInput>("/auth/login", input);
}

export function loginWithGoogle(input: GoogleLoginInput) {
  return post<AuthResponse, GoogleLoginInput>("/auth/google", input);
}

export function refreshSession() {
  return apiRequest<MessageResponse>("/auth/refresh", {
    method: "POST",
  });
}

export function logout() {
  return apiRequest<MessageResponse>("/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}

export function forgotPassword(input: EmailInput) {
  return post<MessageResponse, EmailInput>("/auth/forgot-password", input);
}

export function resetPassword(input: ResetPasswordInput) {
  return post<MessageResponse, ResetPasswordInput>(
    "/auth/reset-password",
    input,
  );
}

export function changePassword(input: ChangePasswordInput) {
  return apiRequest<MessageResponse>("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
