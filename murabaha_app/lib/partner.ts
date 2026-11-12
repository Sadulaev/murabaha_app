declare global {
  interface Window {
    /** Set by the bootstrap script when the visitor opened `/ur/{slug}`. */
    __murabahaPathSlug?: string;
    /** Restores `/ur/{slug}` after Next has hydrated the home page. */
    __murabahaRestorePartnerUrl?: () => void;
  }
}

export type StoredPartner = {
  id: string;
  name: string;
};

export const PARTNER_STORAGE_KEY = "murabaha_partner";

export function loadStoredPartner(): StoredPartner | null {
  try {
    const raw = localStorage.getItem(PARTNER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPartner>;
    if (typeof parsed.id !== "string" || typeof parsed.name !== "string") return null;
    if (!parsed.id.trim() || !parsed.name.trim()) return null;
    return { id: parsed.id.trim(), name: parsed.name.trim() };
  } catch {
    return null;
  }
}

export function saveStoredPartner(partner: StoredPartner): void {
  try {
    localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(partner));
  } catch {
    // ignore quota / private mode
  }
}

export function readBootstrappedPartnerSlug(): string | null {
  if (typeof window === "undefined") return null;
  const bootstrapped = window.__murabahaPathSlug?.trim().toLowerCase();
  if (bootstrapped) return bootstrapped;

  const match = window.location.pathname.match(/^\/ur\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    const slug = decodeURIComponent(match[1]).trim().toLowerCase();
    return slug || null;
  } catch {
    return match[1].trim().toLowerCase() || null;
  }
}

export function restorePartnerUrl(): void {
  window.__murabahaRestorePartnerUrl?.();
}

/** Referral URL: /ur/{latin slug of the full partner name}. */
export function buildPartnerLink(slug: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/ur/${encodeURIComponent(slug.trim().toLowerCase())}`;
}
