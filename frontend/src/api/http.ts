import { getAccessToken } from "../auth/token";

export type ApiError = {
  status: number;
  message: string;
};

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL as string;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw { status: res.status, message: text || res.statusText } satisfies ApiError;
  }

  // 204
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

