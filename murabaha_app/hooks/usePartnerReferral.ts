"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  loadStoredPartner,
  saveStoredPartner,
  type StoredPartner,
} from "@/lib/partner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Captures partner from ?p= URL param into localStorage (overwrite only).
 * Without ?p=, keeps whatever is already stored — never clears.
 */
export function usePartnerReferral(): StoredPartner | null {
  const searchParams = useSearchParams();
  const partnerParam = searchParams.get("p");
  const [partner, setPartner] = useState<StoredPartner | null>(null);

  useEffect(() => {
    const stored = loadStoredPartner();
    setPartner(stored);

    if (!partnerParam) return;

    let cancelled = false;

    const resolve = async () => {
      try {
        const res = await fetch(`${API_URL}/api/partners/${encodeURIComponent(partnerParam)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string; name?: string };
        if (!data.id || !data.name || cancelled) return;
        const next: StoredPartner = { id: data.id, name: data.name };
        saveStoredPartner(next);
        setPartner(next);
      } catch {
        // keep previously stored partner on network failure
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [partnerParam]);

  return partner;
}
