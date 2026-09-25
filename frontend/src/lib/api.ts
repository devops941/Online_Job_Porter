import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "jobportal.token";
export const USER_KEY = "jobportal.user";

/**
 * In dev the Vite proxy forwards /api to the FastAPI server. Set VITE_API_URL
 * when the frontend is served from somewhere other than the API host.
 */
const baseURL = import.meta.env.VITE_API_URL?.trim()
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}`
  : "";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status;
    // A 401 means the stored token is gone or expired: drop it so the router
    // sends the user back to the login screen instead of looping on failures.
    if (status === 401 && !error.config?.url?.includes("/api/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?expired=1");
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
    if (error.response?.status === 403) return "You do not have permission to do that.";
    if (error.response?.status === 404) return "That record could not be found.";
    if (error.response?.status === 429) return "Too many requests. Please slow down.";
    if (error.code === "ERR_NETWORK") return "Cannot reach the API server.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
