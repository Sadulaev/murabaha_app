/**
 * Server-side installment math aligned with category term settings.
 * Frontend should mirror this formula when calculating live preview.
 */

export function roundToLowerHundred(value: number): number {
  return Math.floor(value / 100) * 100
}

export interface CategoryInstallmentInput {
  cost: number
  firstPayment: number
  period: number
  /** Monthly markup percent for the selected term (e.g. 5.0). */
  markupPercent: number
  /**
   * When true, markup base = full cost.
   * When false, markup base = cost - firstPayment.
   */
  includeFirstPaymentInMarkup: boolean
  /** Minimum down payment percent required for this term. */
  minDownPaymentPercent: number
}

export interface CategoryInstallmentResult {
  ok: true
  monthlyPayment: number
  summaryPayment: number
  markupAmount: number
  markupBase: number
  effectiveMarkupPercent: number
}

export interface CategoryInstallmentError {
  ok: false
  error: string
}

export function calculateCategoryInstallment(
  input: CategoryInstallmentInput,
): CategoryInstallmentResult | CategoryInstallmentError {
  const {
    cost,
    firstPayment,
    period,
    markupPercent,
    includeFirstPaymentInMarkup,
    minDownPaymentPercent,
  } = input

  if (!Number.isFinite(cost) || cost <= 0) {
    return { ok: false, error: 'Некорректная стоимость.' }
  }
  if (!Number.isFinite(period) || period <= 0) {
    return { ok: false, error: 'Некорректный срок.' }
  }
  if (!Number.isFinite(markupPercent) || markupPercent < 0) {
    return { ok: false, error: 'Некорректная наценка.' }
  }
  if (!Number.isFinite(firstPayment) || firstPayment < 0) {
    return { ok: false, error: 'Некорректный первый взнос.' }
  }
  if (firstPayment > cost) {
    return { ok: false, error: 'Первый взнос не может превышать стоимость.' }
  }

  const minDownPayment = Math.ceil((cost * minDownPaymentPercent) / 100)
  if (firstPayment < minDownPayment) {
    return {
      ok: false,
      error: `Минимальный первый взнос для срока ${period} мес.: ${minDownPayment} ₽ (${minDownPaymentPercent}%).`,
    }
  }

  const markupBase = includeFirstPaymentInMarkup ? cost : Math.max(cost - firstPayment, 0)
  const markupAmount = markupBase * (markupPercent / 100) * period
  const monthlyPayment = roundToLowerHundred((cost + markupAmount - firstPayment) / period)
  const summaryPayment = firstPayment + monthlyPayment * period

  return {
    ok: true,
    monthlyPayment,
    summaryPayment,
    markupAmount,
    markupBase,
    effectiveMarkupPercent: markupPercent,
  }
}
