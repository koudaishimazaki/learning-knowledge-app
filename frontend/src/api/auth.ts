import { apiFetch } from "./http";

export type TokenResponse = { access_token: string; token_type: "bearer" };
export type UserResponse = { id: string; email: string };

export async function register(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function me(): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/auth/me");
}

