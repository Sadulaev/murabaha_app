"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { FALLBACK_CATEGORY, type CalculatorCategory, type CalculatorConfig } from "@/lib/calculator";

export type CalculatorConfigState = {
  categories: CalculatorCategory[];
  loading: boolean;
  /** True when the API was unreachable or returned no usable categories. */
  usingFallback: boolean;
};

function usableCategories(config: CalculatorConfig): CalculatorCategory[] {
  return config.categories
    .map((category) => ({
      ...category,
      terms: [...category.terms].sort((a, b) => a.months - b.months),
    }))
    .filter((category) => category.terms.length > 0);
}

/** Loads calculator categories for the partner (or the global catalog). Waits until `enabled`. */
export function useCalculatorConfig(partnerId: string | null, enabled: boolean): CalculatorConfigState {
  const [state, setState] = useState<CalculatorConfigState>({
    categories: [FALLBACK_CATEGORY],
    loading: true,
    usingFallback: true,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async (withPartner: boolean): Promise<CalculatorConfig | null> => {
      const qs = withPartner && partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : "";
      const res = await fetch(apiUrl(`/api/categories/config${qs}`));
      if (!res.ok) return null;
      return (await res.json()) as CalculatorConfig;
    };

    const run = async () => {
      try {
        // A stale stored partner (deleted in admin) returns 404 — fall back to the global catalog.
        const config = (await load(true)) ?? (partnerId ? await load(false) : null);
        if (cancelled) return;
        const categories = config ? usableCategories(config) : [];
        setState(
          categories.length > 0
            ? { categories, loading: false, usingFallback: false }
            : { categories: [FALLBACK_CATEGORY], loading: false, usingFallback: true },
        );
      } catch {
        if (!cancelled) setState({ categories: [FALLBACK_CATEGORY], loading: false, usingFallback: true });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [partnerId, enabled]);

  return state;
}
