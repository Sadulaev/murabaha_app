"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/api";
import {
  loadStoredPartner,
  saveStoredPartner,
  type StoredPartner,
} from "@/lib/partner";

export type PartnerReferral = {
  partner: StoredPartner | null;
  /** False until localStorage is read and any `?p=` lookup has settled. */
  ready: boolean;
};

/**
 * Captures partner from ?p= URL param into localStorage (overwrite only).
 * Without ?p=, keeps whatever is already stored — never clears.
 */
export function usePartnerReferral(): PartnerReferral {
  const searchParams = useSearchParams();
  const partnerParam = searchParams.get("p");
  const [state, setState] = useState<PartnerReferral>({ partner: null, ready: false });

  useEffect(() => {
    const stored = loadStoredPartner();

    if (!partnerParam) {
      setState({ partner: stored, ready: true });
      return;
    }

    setState({ partner: stored, ready: false });
    let cancelled = false;

    const resolve = async () => {
      let next = stored;
      try {
        const res = await fetch(apiUrl(`/api/partners/${encodeURIComponent(partnerParam)}`));
        if (res.ok) {
          const data = (await res.json()) as { id?: string; name?: string };
          if (data.id && data.name) {
            next = { id: data.id, name: data.name };
            saveStoredPartner(next);
          }
        }
      } catch {
        // keep previously stored partner on network failure
      }
      if (!cancelled) setState({ partner: next, ready: true });
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [partnerParam]);

  return state;
}
