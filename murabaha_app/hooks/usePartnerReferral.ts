"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/api";
import {
  loadStoredPartner,
  readBootstrappedPartnerSlug,
  restorePartnerUrl,
  saveStoredPartner,
  type StoredPartner,
} from "@/lib/partner";

export type PartnerReferral = {
  partner: StoredPartner | null;
  /** False until localStorage is read and any referral lookup has settled. */
  ready: boolean;
};

/**
 * Captures a partner into localStorage (overwrite only, never clears).
 * `/ur/{slug}` wins over the legacy `?p=` id.
 * The slug is stashed by the bootstrap script before Next hydrates.
 */
export function usePartnerReferral(): PartnerReferral {
  const searchParams = useSearchParams();
  const partnerParam = searchParams.get("p");
  const [state, setState] = useState<PartnerReferral>({ partner: null, ready: false });

  useEffect(() => {
    restorePartnerUrl();
    const slug = readBootstrappedPartnerSlug();
    const stored = loadStoredPartner();
    const legacyId = slug ? null : partnerParam;

    if (!slug && !legacyId) {
      setState({ partner: stored, ready: true });
      return;
    }

    setState({ partner: stored, ready: false });
    let cancelled = false;

    const resolve = async () => {
      let next = stored;
      try {
        const path = slug
          ? `/api/partners/by-slug/${encodeURIComponent(slug)}`
          : `/api/partners/${encodeURIComponent(legacyId ?? "")}`;
        const res = await fetch(apiUrl(path));
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
