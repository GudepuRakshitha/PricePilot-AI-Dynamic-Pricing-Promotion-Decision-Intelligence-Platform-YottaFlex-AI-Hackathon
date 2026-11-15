import axios, { AxiosError } from "axios";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api/v1";

export const TOKEN_KEY = "pricepilot_access_token";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: unknown; message?: string; error?: string }
      | undefined;
    if (data) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item: { loc?: unknown[]; msg?: string }) => {
            const field = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "";
            return field ? `${field}: ${item.msg}` : item.msg || "Invalid value";
          })
          .join("; ");
      }
      if (data.message) return data.message;
      if (data.error) return data.error;
    }
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (!error.response) {
      return "Cannot reach the PricePilot API. Confirm the backend is running on port 8000.";
    }
    return `Request failed with status ${error.response.status}.`;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export function unwrapList<T>(payload: { items: T[] } | T[]): T[] {
  return Array.isArray(payload) ? payload : payload.items;
}
