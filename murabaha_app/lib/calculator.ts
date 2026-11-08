export const MIN_COST = 10000;
export const MAX_COST = 300000;
export const MAX_TERM_MONTHS = 24;
/** Upper bound for the down-payment slider, as a share of cost. */
export const MAX_FIRST_PAYMENT_SHARE = 0.8;

export type CalculatorTerm = {
  months: number;
  markupPercent: number;
  minDownPaymentPercent: number;
};

export type CalculatorCategory = {
  id: string;
  name: string;
  includeFirstPaymentInMarkup: boolean;
  terms: CalculatorTerm[];
};

export type CalculatorConfig = {
  scope: "global" | "partner";
  partnerId: string | null;
  partnerName: string | null;
  fallbackToGlobal: boolean;
  categories: CalculatorCategory[];
};

export const FALLBACK_CATEGORY_ID = "fallback";

/** Mirrors the server's seeded "Общая" category; used only when the API returns nothing. */
export function buildDefaultTerms(): CalculatorTerm[] {
  const terms: CalculatorTerm[] = [];
  for (let months = 3; months <= MAX_TERM_MONTHS; months += 1) {
    let minDownPaymentPercent = 0;
    if (months >= 24) minDownPaymentPercent = 50;
    else if (months >= 20) minDownPaymentPercent = 40;
    else if (months >= 13) minDownPaymentPercent = 30;
    else if (months >= 9) minDownPaymentPercent = 20;

    terms.push({
      months,
      markupPercent: Number((5 - (months - 3) * 0.1).toFixed(2)),
      minDownPaymentPercent,
    });
  }
  return terms;
}

export const FALLBACK_CATEGORY: CalculatorCategory = {
  id: FALLBACK_CATEGORY_ID,
  name: "Общая",
  includeFirstPaymentInMarkup: true,
  terms: buildDefaultTerms(),
};

export type CalculationResult = {
  monthlyPayment: number;
  summaryPayment: number;
  monthlyAdditionalPayment: number;
  markupPercent: number;
};

export function getGuarantorsCount(cost: number) {
  return cost <= 100000 ? 1 : 2;
}

export function roundToNearestHundred(value: number): number {
  return Math.round(value / 100) * 100;
}

export function roundToLowerHundred(value: number): number {
  return Math.floor(value / 100) * 100;
}

export function roundToUpperHundred(value: number): number {
  return Math.ceil(value / 100) * 100;
}

/** Minimum down payment in rubles, rounded up to a hundred so it always satisfies the server check. */
export function getMinFirstPayment(cost: number, minDownPaymentPercent: number): number {
  if (cost <= 0 || minDownPaymentPercent <= 0) return 0;
  return Math.min(roundToUpperHundred((cost * minDownPaymentPercent) / 100), cost);
}

export function getMaxFirstPayment(cost: number, minFirstPayment: number): number {
  return Math.max(roundToNearestHundred(cost * MAX_FIRST_PAYMENT_SHARE), minFirstPayment);
}

/** Closest available term to `months`; ties go to the longer term. */
export function snapToTerm(terms: CalculatorTerm[], months: number): CalculatorTerm {
  let best = terms[0];
  for (const term of terms) {
    const diff = Math.abs(term.months - months);
    const bestDiff = Math.abs(best.months - months);
    if (diff < bestDiff || (diff === bestDiff && term.months > best.months)) {
      best = term;
    }
  }
  return best;
}

export function sliderToCost(position: number): number {
  if (position <= 50) {
    const raw = MIN_COST + (position / 50) * 140000;
    return Math.round(raw / 500) * 500;
  }

  const raw = 150000 + ((position - 50) / 50) * 150000;
  return Math.round(raw / 5000) * 5000;
}

export function costToSlider(value: number): number {
  if (value <= 150000) {
    return ((value - MIN_COST) / 140000) * 50;
  }

  return 50 + ((value - 150000) / 150000) * 50;
}

/** Same formula as murabaha_server/src/services/calculator.ts. */
export function calculateInstallment({
  cost,
  firstPayment,
  period,
  markupPercent,
  includeFirstPaymentInMarkup,
}: {
  cost: number;
  firstPayment: number;
  period: number;
  markupPercent: number;
  includeFirstPaymentInMarkup: boolean;
}): CalculationResult {
  if (cost <= 0 || period <= 0) {
    return { monthlyPayment: 0, summaryPayment: 0, monthlyAdditionalPayment: 0, markupPercent };
  }

  const markupBase = includeFirstPaymentInMarkup ? cost : Math.max(cost - firstPayment, 0);
  const markupAmount = markupBase * (markupPercent / 100) * period;

  // Round monthly DOWN so rounding loss is always on our side, never the user's
  const monthlyPayment = roundToLowerHundred((cost + markupAmount - firstPayment) / period);
  const summaryPayment = firstPayment + monthlyPayment * period;

  return {
    monthlyPayment,
    summaryPayment,
    monthlyAdditionalPayment: roundToLowerHundred(markupAmount / period),
    markupPercent,
  };
}
