import { randomBytes } from 'crypto'
import type {
  CategorySettingsUpdateInput,
  CategoryTermSetting,
  ProductCategory,
  ProductCategoryInput,
  ProductCategoryUpdateInput,
  ProductCategoryWithTerms,
  PublicCalculatorConfig,
  PublicCategoryConfig,
} from '../types/category'
import { DEFAULT_AMOUNT_MAX, DEFAULT_AMOUNT_MIN, MAX_AMOUNT_LIMIT, MAX_TERM_MONTHS } from '../types/category'
import { getDb } from './db'
import { getPartnerById } from './partners'

function generateId(): string {
  return randomBytes(8).toString('hex')
}

function mapRowToCategory(row: Record<string, unknown>): ProductCategory {
  return {
    id: String(row.id),
    partnerId: row.partner_id == null ? null : String(row.partner_id),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
    includeFirstPaymentInMarkup: Boolean(row.include_first_payment_in_markup),
    amountMin: Number(row.amount_min ?? DEFAULT_AMOUNT_MIN),
    amountMax: Number(row.amount_max ?? DEFAULT_AMOUNT_MAX),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function mapRowToTerm(row: Record<string, unknown>): CategoryTermSetting {
  return {
    months: Number(row.months),
    markupPercent: toNullableNumber(row.markup_percent),
    minDownPaymentPercent: toNullableNumber(row.min_down_payment_percent),
  }
}

/** Excel-like defaults from the admin spreadsheet prototype (months 3–24). */
export function buildDefaultTermSettings(): CategoryTermSetting[] {
  const terms: CategoryTermSetting[] = []

  for (let months = 1; months <= MAX_TERM_MONTHS; months += 1) {
    if (months < 3) {
      terms.push({ months, markupPercent: null, minDownPaymentPercent: null })
      continue
    }

    const markupPercent = Number((5 - (months - 3) * 0.1).toFixed(2))

    let minDownPaymentPercent = 0
    if (months >= 24) minDownPaymentPercent = 50
    else if (months >= 20) minDownPaymentPercent = 40
    else if (months >= 13) minDownPaymentPercent = 30
    else if (months >= 9) minDownPaymentPercent = 20

    terms.push({ months, markupPercent, minDownPaymentPercent })
  }

  return terms
}

export function assertAmountLimits(amountMin: number, amountMax: number): void {
  if (!Number.isInteger(amountMin) || !Number.isInteger(amountMax)) {
    throw Object.assign(new Error('Лимиты суммы должны быть целыми числами.'), { statusCode: 400 })
  }
  if (amountMin < 0 || amountMax > MAX_AMOUNT_LIMIT || amountMax <= amountMin) {
    throw Object.assign(new Error('Лимит «от» должен быть меньше лимита «до».'), { statusCode: 400 })
  }
}

function resolveAmountLimits(
  amountMin: number | undefined,
  amountMax: number | undefined,
  fallbackMin = DEFAULT_AMOUNT_MIN,
  fallbackMax = DEFAULT_AMOUNT_MAX,
): { amountMin: number; amountMax: number } {
  const min = amountMin ?? fallbackMin
  const max = amountMax ?? fallbackMax
  assertAmountLimits(min, max)
  return { amountMin: min, amountMax: max }
}

function emptyTermGrid(): CategoryTermSetting[] {
  return Array.from({ length: MAX_TERM_MONTHS }, (_, i) => ({
    months: i + 1,
    markupPercent: null,
    minDownPaymentPercent: null,
  }))
}

function mergeTermsGrid(stored: CategoryTermSetting[]): CategoryTermSetting[] {
  const byMonth = new Map(stored.map((t) => [t.months, t]))
  return Array.from({ length: MAX_TERM_MONTHS }, (_, i) => {
    const months = i + 1
    return byMonth.get(months) ?? { months, markupPercent: null, minDownPaymentPercent: null }
  })
}

async function insertTerms(categoryId: string, terms: CategoryTermSetting[]): Promise<void> {
  const db = getDb()
  for (const term of terms) {
    await db.query(
      `INSERT INTO category_term_settings
        (category_id, months, markup_percent, min_down_payment_percent)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (category_id, months) DO UPDATE SET
         markup_percent = EXCLUDED.markup_percent,
         min_down_payment_percent = EXCLUDED.min_down_payment_percent`,
      [categoryId, term.months, term.markupPercent, term.minDownPaymentPercent],
    )
  }
}

async function getTermsForCategory(categoryId: string): Promise<CategoryTermSetting[]> {
  const db = getDb()
  const result = await db.query(
    `SELECT months, markup_percent, min_down_payment_percent
     FROM category_term_settings
     WHERE category_id = $1
     ORDER BY months ASC`,
    [categoryId],
  )
  return mergeTermsGrid(result.rows.map((row: Record<string, unknown>) => mapRowToTerm(row)))
}

export async function seedDefaultGlobalCategoryIfNeeded(): Promise<void> {
  const db = getDb()
  const existing = await db.query(
    `SELECT id FROM product_categories WHERE partner_id IS NULL LIMIT 1`,
  )
  if (existing.rows.length > 0) return

  const now = new Date().toISOString()
  const category: ProductCategory = {
    id: generateId(),
    partnerId: null,
    name: 'Общая',
    sortOrder: 0,
    isActive: true,
    includeFirstPaymentInMarkup: true,
    amountMin: DEFAULT_AMOUNT_MIN,
    amountMax: DEFAULT_AMOUNT_MAX,
    createdAt: now,
    updatedAt: now,
  }

  await db.query(
    `INSERT INTO product_categories
      (id, partner_id, name, sort_order, is_active, include_first_payment_in_markup, amount_min, amount_max, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      category.id,
      null,
      category.name,
      category.sortOrder,
      category.isActive,
      category.includeFirstPaymentInMarkup,
      category.amountMin,
      category.amountMax,
      category.createdAt,
      category.updatedAt,
    ],
  )

  await insertTerms(category.id, buildDefaultTermSettings())
}

export async function listCategories(partnerId: string | null): Promise<ProductCategory[]> {
  const db = getDb()
  const result =
    partnerId === null
      ? await db.query(
          `SELECT * FROM product_categories
           WHERE partner_id IS NULL
           ORDER BY sort_order ASC, created_at ASC`,
        )
      : await db.query(
          `SELECT * FROM product_categories
           WHERE partner_id = $1
           ORDER BY sort_order ASC, created_at ASC`,
          [partnerId],
        )

  return result.rows.map((row: Record<string, unknown>) => mapRowToCategory(row))
}

export async function getCategoryById(id: string): Promise<ProductCategory | null> {
  const db = getDb()
  const result = await db.query(`SELECT * FROM product_categories WHERE id = $1`, [id])
  if (result.rows.length === 0) return null
  return mapRowToCategory(result.rows[0] as Record<string, unknown>)
}

export async function getCategoryWithTerms(id: string): Promise<ProductCategoryWithTerms | null> {
  const category = await getCategoryById(id)
  if (!category) return null
  const terms = await getTermsForCategory(id)
  return { ...category, terms }
}

export async function createCategory(input: ProductCategoryInput): Promise<ProductCategoryWithTerms> {
  const db = getDb()
  const now = new Date().toISOString()
  const partnerId = input.partnerId ?? null

  if (partnerId) {
    const partner = await getPartnerById(partnerId)
    if (!partner) {
      throw Object.assign(new Error('Партнёр не найден.'), { statusCode: 404 })
    }
  }

  const name = input.name.trim()
  if (!name) {
    throw Object.assign(new Error('Укажите название категории.'), { statusCode: 400 })
  }
  if (name.length > 120) {
    throw Object.assign(new Error('Название категории слишком длинное.'), { statusCode: 400 })
  }

  const sortOrder =
    typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)
      ? Math.trunc(input.sortOrder)
      : 0

  const amounts = resolveAmountLimits(input.amountMin, input.amountMax)

  const category: ProductCategory = {
    id: generateId(),
    partnerId,
    name,
    sortOrder,
    isActive: input.isActive !== false,
    includeFirstPaymentInMarkup: input.includeFirstPaymentInMarkup !== false,
    amountMin: amounts.amountMin,
    amountMax: amounts.amountMax,
    createdAt: now,
    updatedAt: now,
  }

  await db.query(
    `INSERT INTO product_categories
      (id, partner_id, name, sort_order, is_active, include_first_payment_in_markup, amount_min, amount_max, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      category.id,
      category.partnerId,
      category.name,
      category.sortOrder,
      category.isActive,
      category.includeFirstPaymentInMarkup,
      category.amountMin,
      category.amountMax,
      category.createdAt,
      category.updatedAt,
    ],
  )

  // New categories start with an empty 1..24 grid; admin fills the table.
  // The initial global "Общая" category is seeded separately with Excel defaults.
  await insertTerms(category.id, emptyTermGrid())

  return {
    ...category,
    terms: await getTermsForCategory(category.id),
  }
}

export async function updateCategory(
  id: string,
  input: ProductCategoryUpdateInput,
): Promise<ProductCategory | null> {
  const existing = await getCategoryById(id)
  if (!existing) return null

  const name =
    typeof input.name === 'string' ? input.name.trim() : existing.name
  if (!name) {
    throw Object.assign(new Error('Укажите название категории.'), { statusCode: 400 })
  }
  if (name.length > 120) {
    throw Object.assign(new Error('Название категории слишком длинное.'), { statusCode: 400 })
  }

  const sortOrder =
    typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)
      ? Math.trunc(input.sortOrder)
      : existing.sortOrder

  const isActive =
    typeof input.isActive === 'boolean' ? input.isActive : existing.isActive

  const includeFirstPaymentInMarkup =
    typeof input.includeFirstPaymentInMarkup === 'boolean'
      ? input.includeFirstPaymentInMarkup
      : existing.includeFirstPaymentInMarkup

  const updatedAt = new Date().toISOString()
  const db = getDb()
  await db.query(
    `UPDATE product_categories
     SET name = $2,
         sort_order = $3,
         is_active = $4,
         include_first_payment_in_markup = $5,
         updated_at = $6
     WHERE id = $1`,
    [id, name, sortOrder, isActive, includeFirstPaymentInMarkup, updatedAt],
  )

  if (input.amountMin !== undefined || input.amountMax !== undefined) {
    const amounts = resolveAmountLimits(
      input.amountMin,
      input.amountMax,
      existing.amountMin,
      existing.amountMax,
    )
    await db.query(
      `UPDATE product_categories
       SET amount_min = $2,
           amount_max = $3,
           updated_at = $4
       WHERE id = $1`,
      [id, amounts.amountMin, amounts.amountMax, updatedAt],
    )
  }

  return getCategoryById(id)
}

export function validateTermsPayload(terms: CategoryTermSetting[]): string | null {
  if (!Array.isArray(terms) || terms.length === 0) {
    return 'Передайте настройки сроков (массив terms).'
  }

  const seen = new Set<number>()
  for (const term of terms) {
    if (!term || typeof term !== 'object') {
      return 'Некорректная строка настроек срока.'
    }
    const months = Number(term.months)
    if (!Number.isInteger(months) || months < 1 || months > MAX_TERM_MONTHS) {
      return `Срок должен быть целым числом от 1 до ${MAX_TERM_MONTHS}.`
    }
    if (seen.has(months)) {
      return `Дублируется срок ${months} мес.`
    }
    seen.add(months)

    const markup = term.markupPercent
    const minDp = term.minDownPaymentPercent

    if (markup !== null && markup !== undefined) {
      const m = Number(markup)
      if (!Number.isFinite(m) || m < 0 || m > 100) {
        return `Наценка для ${months} мес. должна быть от 0 до 100% или пустой.`
      }
    }

    if (minDp !== null && minDp !== undefined) {
      const d = Number(minDp)
      if (!Number.isFinite(d) || d < 0 || d > 100) {
        return `Мин. первый взнос для ${months} мес. должен быть от 0 до 100% или пустым.`
      }
    }

    // Enabled term requires both values (both null = disabled / hidden in calculator)
    const markupNull = markup === null || markup === undefined
    const minDpNull = minDp === null || minDp === undefined
    if (!markupNull && minDpNull) {
      return `Для срока ${months} мес. укажите мин. первый взнос или очистите наценку.`
    }
    if (markupNull && !minDpNull) {
      return `Для срока ${months} мес. укажите наценку или очистите мин. первый взнос.`
    }
  }

  return null
}

export async function updateCategorySettings(
  id: string,
  input: CategorySettingsUpdateInput,
): Promise<ProductCategoryWithTerms | null> {
  const existing = await getCategoryById(id)
  if (!existing) return null

  if (typeof input.includeFirstPaymentInMarkup !== 'boolean') {
    throw Object.assign(new Error('Укажите includeFirstPaymentInMarkup (boolean).'), {
      statusCode: 400,
    })
  }

  const validationError = validateTermsPayload(input.terms)
  if (validationError) {
    throw Object.assign(new Error(validationError), { statusCode: 400 })
  }

  const normalized = mergeTermsGrid(
    input.terms.map((t) => ({
      months: Number(t.months),
      markupPercent:
        t.markupPercent === null || t.markupPercent === undefined
          ? null
          : Number(Number(t.markupPercent).toFixed(4)),
      minDownPaymentPercent:
        t.minDownPaymentPercent === null || t.minDownPaymentPercent === undefined
          ? null
          : Number(Number(t.minDownPaymentPercent).toFixed(4)),
    })),
  )

  const updatedAt = new Date().toISOString()
  const db = getDb()

  await db.query(
    `UPDATE product_categories
     SET include_first_payment_in_markup = $2,
         updated_at = $3
     WHERE id = $1`,
    [id, input.includeFirstPaymentInMarkup, updatedAt],
  )

  await insertTerms(id, normalized)

  return getCategoryWithTerms(id)
}

export async function deleteCategory(id: string): Promise<boolean> {
  const db = getDb()
  const result = (await db.query(`DELETE FROM product_categories WHERE id = $1`, [id])) as unknown as {
    rowCount: number
  }
  return result.rowCount > 0
}

function toPublicCategory(category: ProductCategoryWithTerms): PublicCategoryConfig | null {
  if (!category.isActive) return null

  const terms = category.terms
    .filter(
      (t) =>
        t.markupPercent !== null &&
        t.minDownPaymentPercent !== null &&
        Number.isFinite(t.markupPercent) &&
        Number.isFinite(t.minDownPaymentPercent),
    )
    .map((t) => ({
      months: t.months,
      markupPercent: Number(t.markupPercent),
      minDownPaymentPercent: Number(t.minDownPaymentPercent),
    }))

  if (terms.length === 0) return null

  return {
    id: category.id,
    name: category.name,
    includeFirstPaymentInMarkup: category.includeFirstPaymentInMarkup,
    amountMin: category.amountMin,
    amountMax: category.amountMax,
    terms,
  }
}

async function loadPublicCategories(partnerId: string | null): Promise<PublicCategoryConfig[]> {
  const list = await listCategories(partnerId)
  const result: PublicCategoryConfig[] = []

  for (const category of list) {
    const withTerms = await getCategoryWithTerms(category.id)
    if (!withTerms) continue
    const pub = toPublicCategory(withTerms)
    if (pub) result.push(pub)
  }

  return result
}

/**
 * Public calculator config.
 * If `partnerId` is set and that partner has no usable categories, falls back to global.
 */
export async function getPublicCalculatorConfig(
  partnerId?: string | null,
): Promise<PublicCalculatorConfig> {
  if (partnerId) {
    const partner = await getPartnerById(partnerId)
    if (!partner) {
      throw Object.assign(new Error('Партнёр не найден.'), { statusCode: 404 })
    }

    const partnerCategories = await loadPublicCategories(partnerId)
    if (partnerCategories.length > 0) {
      return {
        scope: 'partner',
        partnerId: partner.id,
        partnerName: partner.name,
        fallbackToGlobal: false,
        categories: partnerCategories,
      }
    }

    const globalCategories = await loadPublicCategories(null)
    return {
      scope: 'global',
      partnerId: partner.id,
      partnerName: partner.name,
      fallbackToGlobal: true,
      categories: globalCategories,
    }
  }

  return {
    scope: 'global',
    partnerId: null,
    partnerName: null,
    fallbackToGlobal: false,
    categories: await loadPublicCategories(null),
  }
}
