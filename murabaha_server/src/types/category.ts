/** Max installment term supported by admin table / calculator. */
export const MAX_TERM_MONTHS = 24

/** Default product-amount window shown on the landing and used by the calculator. */
export const DEFAULT_AMOUNT_MIN = 10_000
export const DEFAULT_AMOUNT_MAX = 300_000
export const MAX_AMOUNT_LIMIT = 100_000_000

export interface CategoryTermSetting {
  /** Installment length in months (1..MAX_TERM_MONTHS). */
  months: number
  /**
   * Monthly markup percent for this term.
   * `null` = term is disabled and must not appear in the calculator.
   */
  markupPercent: number | null
  /**
   * Minimum down payment as percent of cost for this term.
   * Ignored by calculator when `markupPercent` is null.
   */
  minDownPaymentPercent: number | null
}

export interface ProductCategory {
  id: string
  /** `null` = global (non-partner) catalog. */
  partnerId: string | null
  name: string
  sortOrder: number
  isActive: boolean
  /**
   * When true, markup is calculated from full `cost`.
   * When false, markup is calculated from `cost - firstPayment`.
   */
  includeFirstPaymentInMarkup: boolean
  /** Inclusive lower bound of the product cost, in rubles. */
  amountMin: number
  /** Inclusive upper bound of the product cost, in rubles. */
  amountMax: number
  createdAt: string
  updatedAt: string
}

export interface ProductCategoryWithTerms extends ProductCategory {
  terms: CategoryTermSetting[]
}

export interface ProductCategoryInput {
  name: string
  partnerId?: string | null
  sortOrder?: number
  isActive?: boolean
  includeFirstPaymentInMarkup?: boolean
  amountMin?: number
  amountMax?: number
}

export interface ProductCategoryUpdateInput {
  name?: string
  sortOrder?: number
  isActive?: boolean
  includeFirstPaymentInMarkup?: boolean
  amountMin?: number
  amountMax?: number
}

export interface CategorySettingsUpdateInput {
  includeFirstPaymentInMarkup: boolean
  terms: CategoryTermSetting[]
}

/** Public calculator payload for one category (enabled terms only). */
export interface PublicCategoryConfig {
  id: string
  name: string
  includeFirstPaymentInMarkup: boolean
  amountMin: number
  amountMax: number
  terms: Array<{
    months: number
    markupPercent: number
    minDownPaymentPercent: number
  }>
}

export interface PublicCalculatorConfig {
  scope: 'global' | 'partner'
  partnerId: string | null
  partnerName: string | null
  /** True when partner had no categories and global catalog was used. */
  fallbackToGlobal: boolean
  categories: PublicCategoryConfig[]
}
