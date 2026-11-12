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
  /** Inclusive product-cost bounds, in rubles. */
  amountMin: number;
  amountMax: number;
  terms: CalculatorTerm[];
};

export type CategorySpotlight = {
  id: string;
  name: string;
  amountLabel: string;
  termLabel: string;
  downPaymentLabel: string;
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
  amountMin: MIN_COST,
  amountMax: MAX_COST,
  terms: buildDefaultTerms(),
};

function formatSpotlightNumber(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function formatBound(min: number, max: number, format: (value: number) => string, suffix = ""): string {
  if (min === max) return `${format(min)}${suffix}`;
  return `${format(min)} – ${format(max)}${suffix}`;
}

/** Amount, term and minimum down-payment window for the first landing block. */
export function getCategorySpotlight(category: CalculatorCategory): CategorySpotlight {
  const amountMin = Number.isFinite(category.amountMin) ? category.amountMin : MIN_COST;
  const amountMax = Number.isFinite(category.amountMax) ? category.amountMax : MAX_COST;
  let termMin = category.terms[0]?.months ?? 0;
  let termMax = termMin;
  let downMin = category.terms[0]?.minDownPaymentPercent ?? 0;
  let downMax = downMin;

  for (const term of category.terms) {
    if (term.months < termMin) termMin = term.months;
    if (term.months > termMax) termMax = term.months;
    if (term.minDownPaymentPercent < downMin) downMin = term.minDownPaymentPercent;
    if (term.minDownPaymentPercent > downMax) downMax = term.minDownPaymentPercent;
  }

  return {
    id: category.id,
    name: category.name,
    amountLabel: formatBound(amountMin, amountMax, (value) => value.toLocaleString("ru-RU")),
    termLabel: formatBound(termMin, termMax, (value) => String(value), " мес."),
    downPaymentLabel: formatBound(downMin, downMax, formatSpotlightNumber, "%"),
  };
}

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

export function costScaleMidpoint(minCost: number, maxCost: number): number {
  if (minCost === MIN_COST && maxCost === MAX_COST) return 150_000;
  return Math.round((minCost + maxCost) / 2);
}

export function sliderToCost(position: number, minCost = MIN_COST, maxCost = MAX_COST): number {
  if (minCost === MIN_COST && maxCost === MAX_COST) {
    if (position <= 50) {
      const raw = MIN_COST + (position / 50) * 140000;
      return Math.round(raw / 500) * 500;
    }

    const raw = 150000 + ((position - 50) / 50) * 150000;
    return Math.round(raw / 5000) * 5000;
  }

  const min = Math.min(minCost, maxCost);
  const max = Math.max(minCost, maxCost);
  if (position <= 0) return min;
  if (position >= 100) return max;

  const mid = min + (max - min) / 2;
  const raw = position <= 50 ? min + (position / 50) * (mid - min) : mid + ((position - 50) / 50) * (max - mid);
  const step = max - min >= 200_000 ? 5_000 : max - min >= 20_000 ? 500 : 100;
  return Math.min(max, Math.max(min, Math.round(raw / step) * step));
}

export function costToSlider(value: number, minCost = MIN_COST, maxCost = MAX_COST): number {
  if (minCost === MIN_COST && maxCost === MAX_COST) {
    if (value <= 150000) {
      return ((value - MIN_COST) / 140000) * 50;
    }

    return 50 + ((value - 150000) / 150000) * 50;
  }

  const min = Math.min(minCost, maxCost);
  const max = Math.max(minCost, maxCost);
  const clamped = Math.min(max, Math.max(min, value));
  const mid = min + (max - min) / 2;
  if (clamped <= mid) {
    const span = mid - min;
    return span <= 0 ? 0 : ((clamped - min) / span) * 50;
  }
  const span = max - mid;
  return span <= 0 ? 100 : 50 + ((clamped - mid) / span) * 50;
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
