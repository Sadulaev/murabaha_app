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

export function buildPartnerLink(partnerId: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?p=${encodeURIComponent(partnerId)}`;
}
