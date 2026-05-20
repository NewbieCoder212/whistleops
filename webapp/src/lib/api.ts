/**
 * Fetch wrapper for the Hono backend.
 *
 * - In production uses relative URLs (/api/...).
 * - In development reads VITE_BACKEND_URL when the backend is on another port.
 * - Auto-attaches the Supabase access token as a Bearer header when present.
 * - Unwraps the { data: T } envelope used by all app routes.
 */
import { getAccessToken } from "./supabase";
import { DEFAULT_WORKSPACE_ID, getActiveWorkspaceId } from "./workspace";

/** In production always use same-origin /api; ignore VITE_BACKEND_URL if set on Vercel by mistake. */
const API_BASE_URL = import.meta.env.PROD ? "" : import.meta.env.VITE_BACKEND_URL || "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiResponse<T> {
  data: T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const workspaceId = getActiveWorkspaceId() ?? DEFAULT_WORKSPACE_ID;
  headers["X-Workspace-Id"] = workspaceId;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new ApiError(
      json?.error?.message || json?.message || `Request failed with status ${response.status}`,
      response.status,
      json?.error || json
    );
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json: ApiResponse<T> = await response.json();
    return json.data;
  }
  return undefined as T;
}

async function rawRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const workspaceId = getActiveWorkspaceId() ?? DEFAULT_WORKSPACE_ID;
  headers["X-Workspace-Id"] = workspaceId;
  return fetch(url, { ...options, headers, credentials: "include" });
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
  raw: rawRequest,
};
