import { Router, Request, Response } from 'express'
import {
  createCategory,
  deleteCategory,
  getCategoryWithTerms,
  getPublicCalculatorConfig,
  listCategories,
  updateCategory,
  updateCategorySettings,
  buildDefaultTermSettings,
} from '../services/categories'
import { calculateCategoryInstallment } from '../services/calculator'
import type { CategoryTermSetting } from '../types/category'

const router = Router()

function verifyToken(req: Request): boolean {
  const apiKey = req.headers['x-api-key']
  return typeof apiKey === 'string' && apiKey === process.env.ADMIN_API_KEY
}

function parsePartnerIdQuery(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '' || value === 'null' || value === 'global') return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[a-f0-9]{12}$/i.test(trimmed)) return undefined
  return trimmed
}

function statusFromError(err: unknown): number {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const code = Number((err as { statusCode?: unknown }).statusCode)
    if (Number.isInteger(code) && code >= 400 && code < 600) return code
  }
  return 500
}

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function readAmountLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) return Number(value)
  return Number.NaN
}

function parseTermsBody(raw: unknown): CategoryTermSetting[] | null {
  if (!Array.isArray(raw)) return null
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>
    const markupRaw = row.markupPercent
    const minDpRaw = row.minDownPaymentPercent
    return {
      months: Number(row.months),
      markupPercent:
        markupRaw === null || markupRaw === undefined || markupRaw === ''
          ? null
          : Number(markupRaw),
      minDownPaymentPercent:
        minDpRaw === null || minDpRaw === undefined || minDpRaw === ''
          ? null
          : Number(minDpRaw),
    }
  })
}

// ---------------------------------------------------------------------------
// Public: preview installment using category settings
// POST /api/categories/calculate
// { categoryId, cost, firstPayment, period }
// ---------------------------------------------------------------------------
router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : ''
  const cost = Number(body.cost)
  const firstPayment = Number(body.firstPayment)
  const period = Number(body.period)

  if (!categoryId) {
    res.status(400).json({ error: 'Укажите categoryId.' })
    return
  }

  try {
    const category = await getCategoryWithTerms(categoryId)
    if (!category || !category.isActive) {
      res.status(404).json({ error: 'Категория не найдена.' })
      return
    }

    if (!Number.isFinite(cost) || cost < category.amountMin || cost > category.amountMax) {
      res.status(400).json({
        error: `Стоимость должна быть от ${category.amountMin} до ${category.amountMax} ₽.`,
      })
      return
    }

    const term = category.terms.find((t) => t.months === period)
    if (
      !term ||
      term.markupPercent === null ||
      term.minDownPaymentPercent === null
    ) {
      res.status(400).json({ error: 'Выбранный срок недоступен для этой категории.' })
      return
    }

    const result = calculateCategoryInstallment({
      cost,
      firstPayment,
      period,
      markupPercent: term.markupPercent,
      minDownPaymentPercent: term.minDownPaymentPercent,
      includeFirstPaymentInMarkup: category.includeFirstPaymentInMarkup,
    })

    if (!result.ok) {
      res.status(400).json({ error: result.error })
      return
    }

    res.json({
      categoryId: category.id,
      categoryName: category.name,
      includeFirstPaymentInMarkup: category.includeFirstPaymentInMarkup,
      period,
      markupPercent: term.markupPercent,
      minDownPaymentPercent: term.minDownPaymentPercent,
      ...result,
    })
  } catch (err) {
    console.error('Failed to calculate installment:', err)
    res.status(500).json({ error: 'Failed to calculate installment' })
  }
})

// ---------------------------------------------------------------------------
// Admin helper: default Excel-like term grid (not persisted)
// GET /api/categories/defaults/terms
// ---------------------------------------------------------------------------
router.get('/defaults/terms', (req: Request, res: Response): void => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json({
    includeFirstPaymentInMarkup: true,
    terms: buildDefaultTermSettings(),
  })
})

// ---------------------------------------------------------------------------
// Public calculator config
// GET /api/categories/config?partnerId=
// ---------------------------------------------------------------------------
router.get('/config', async (req: Request, res: Response): Promise<void> => {
  const partnerRaw = req.query.partnerId
  let partnerId: string | null = null

  if (typeof partnerRaw === 'string' && partnerRaw.trim()) {
    if (!/^[a-f0-9]{12}$/i.test(partnerRaw.trim())) {
      res.status(400).json({ error: 'Некорректный partnerId.' })
      return
    }
    partnerId = partnerRaw.trim()
  }

  try {
    const config = await getPublicCalculatorConfig(partnerId)
    res.json(config)
  } catch (err) {
    const status = statusFromError(err)
    console.error('Failed to read calculator config:', err)
    res.status(status).json({ error: messageFromError(err, 'Failed to read calculator config') })
  }
})

// ---------------------------------------------------------------------------
// Admin: list categories for global or a partner
// GET /api/categories?partnerId=  (omit / null / global → global catalog)
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const partnerId = parsePartnerIdQuery(req.query.partnerId)
  if (partnerId === undefined && req.query.partnerId !== undefined) {
    res.status(400).json({ error: 'Некорректный partnerId.' })
    return
  }

  try {
    const categories = await listCategories(partnerId ?? null)
    res.json(categories)
  } catch (err) {
    console.error('Failed to list categories:', err)
    res.status(500).json({ error: 'Failed to list categories' })
  }
})

// ---------------------------------------------------------------------------
// Admin: create category
// POST /api/categories  { name, partnerId?, sortOrder?, isActive?, includeFirstPaymentInMarkup? }
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const body = req.body as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name : ''
  const partnerId =
    body.partnerId === undefined || body.partnerId === null || body.partnerId === ''
      ? null
      : typeof body.partnerId === 'string'
        ? body.partnerId.trim()
        : null

  if (partnerId && !/^[a-f0-9]{12}$/i.test(partnerId)) {
    res.status(400).json({ error: 'Некорректный partnerId.' })
    return
  }

  try {
    const category = await createCategory({
      name,
      partnerId,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      includeFirstPaymentInMarkup:
        typeof body.includeFirstPaymentInMarkup === 'boolean'
          ? body.includeFirstPaymentInMarkup
          : undefined,
      amountMin: readAmountLimit(body.amountMin),
      amountMax: readAmountLimit(body.amountMax),
    })
    res.status(201).json(category)
  } catch (err) {
    const status = statusFromError(err)
    console.error('Failed to create category:', err)
    res.status(status).json({ error: messageFromError(err, 'Failed to create category') })
  }
})

// ---------------------------------------------------------------------------
// Admin: get category + full 1..24 terms table
// GET /api/categories/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const category = await getCategoryWithTerms(req.params.id)
    if (!category) {
      res.status(404).json({ error: 'Категория не найдена.' })
      return
    }
    res.json(category)
  } catch (err) {
    console.error('Failed to read category:', err)
    res.status(500).json({ error: 'Failed to read category' })
  }
})

// ---------------------------------------------------------------------------
// Admin: update category meta
// PATCH /api/categories/:id
// ---------------------------------------------------------------------------
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const body = req.body as Record<string, unknown>

  try {
    const updated = await updateCategory(req.params.id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      includeFirstPaymentInMarkup:
        typeof body.includeFirstPaymentInMarkup === 'boolean'
          ? body.includeFirstPaymentInMarkup
          : undefined,
      amountMin: readAmountLimit(body.amountMin),
      amountMax: readAmountLimit(body.amountMax),
    })
    if (!updated) {
      res.status(404).json({ error: 'Категория не найдена.' })
      return
    }
    res.json(updated)
  } catch (err) {
    const status = statusFromError(err)
    console.error('Failed to update category:', err)
    res.status(status).json({ error: messageFromError(err, 'Failed to update category') })
  }
})

// ---------------------------------------------------------------------------
// Admin: save settings table (boolean + 1..24 term rows)
// PUT /api/categories/:id/settings
// { includeFirstPaymentInMarkup, terms: [{ months, markupPercent, minDownPaymentPercent }] }
// ---------------------------------------------------------------------------
router.put('/:id/settings', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const body = req.body as Record<string, unknown>
  const terms = parseTermsBody(body.terms)
  if (!terms) {
    res.status(400).json({ error: 'Передайте массив terms.' })
    return
  }
  if (typeof body.includeFirstPaymentInMarkup !== 'boolean') {
    res.status(400).json({ error: 'Укажите includeFirstPaymentInMarkup (boolean).' })
    return
  }

  try {
    const updated = await updateCategorySettings(req.params.id, {
      includeFirstPaymentInMarkup: body.includeFirstPaymentInMarkup,
      terms,
    })
    if (!updated) {
      res.status(404).json({ error: 'Категория не найдена.' })
      return
    }
    res.json(updated)
  } catch (err) {
    const status = statusFromError(err)
    console.error('Failed to update category settings:', err)
    res.status(status).json({ error: messageFromError(err, 'Failed to update category settings') })
  }
})

// ---------------------------------------------------------------------------
// Admin: delete category
// DELETE /api/categories/:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const ok = await deleteCategory(req.params.id)
    if (!ok) {
      res.status(404).json({ error: 'Категория не найдена.' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete category:', err)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

export default router
