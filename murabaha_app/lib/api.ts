/**
 * Joins an API path.
 * A non-empty NEXT_PUBLIC_API_URL is used as the origin (local dev).
 * An empty or missing value stays on the current host, which is what
 * the production nginx image does: it proxies /api and /uploads.
 */
export function apiUrl(path: string): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  const base = typeof raw === "string" ? raw.replace(/\/$/, "") : "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
