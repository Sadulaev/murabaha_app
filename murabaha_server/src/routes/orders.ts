import { Router, Request, Response } from 'express'
import multer from 'multer'
import type { OrderFilesInput, OrderInput, UploadedFile } from '../types/order'
import { saveOrder, getOrders } from '../services/storage'
import { getPartnerById } from '../services/partners'
import { notifyNewOrder } from '../services/telegram'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 8,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true)
      return
    }

    callback(new Error(`Unsupported file type for ${file.fieldname}`))
  },
})

const uploadFields = upload.fields([
  { name: 'buyerPassportMain', maxCount: 1 },
  { name: 'buyerPassportResidence', maxCount: 1 },
  { name: 'buyerSelfie', maxCount: 1 },
  { name: 'guarantor1PassportMain', maxCount: 1 },
  { name: 'guarantor1PassportResidence', maxCount: 1 },
  { name: 'guarantor2PassportMain', maxCount: 1 },
  { name: 'guarantor2PassportResidence', maxCount: 1 },
  { name: 'productPhoto', maxCount: 1 },
])

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeOrderInput(body: Record<string, unknown>): OrderInput | { error: string } {
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const firstPaymentDate = typeof body.firstPaymentDate === 'string' ? body.firstPaymentDate.trim() : ''
  const guarantor1Phone = typeof body.guarantor1Phone === 'string' ? body.guarantor1Phone.trim() : ''
  const guarantor2Phone = typeof body.guarantor2Phone === 'string' ? body.guarantor2Phone.trim() : undefined
  const storeName = typeof body.storeName === 'string' ? body.storeName.trim() || undefined : undefined
  const sellerPhone = typeof body.sellerPhone === 'string' ? body.sellerPhone.trim() || undefined : undefined
  const partnerId = typeof body.partnerId === 'string' ? body.partnerId.trim() || undefined : undefined
  const partnerName = typeof body.partnerName === 'string' ? body.partnerName.trim() || undefined : undefined
  const cost = parseNumber(body.cost)
  const firstPayment = parseNumber(body.firstPayment)
  const period = parseNumber(body.period)
  const monthlyPayment = parseNumber(body.monthlyPayment)
  const summaryPayment = parseNumber(body.summaryPayment)
  const guarantorsCount = parseNumber(body.guarantorsCount)

  if (!firstName || !lastName || !phone || !firstPaymentDate) {
    return { error: 'Missing or invalid text fields' }
  }

  if ([cost, firstPayment, period, monthlyPayment, summaryPayment, guarantorsCount].some((value) => value === null)) {
    return { error: 'Missing or invalid numeric fields' }
  }

  const normalizedCost = cost as number
  const normalizedFirstPayment = firstPayment as number
  const normalizedPeriod = period as number
  const normalizedMonthlyPayment = monthlyPayment as number
  const normalizedSummaryPayment = summaryPayment as number
  const normalizedGuarantorsCount = guarantorsCount as number

  return {
    cost: normalizedCost,
    firstPayment: normalizedFirstPayment,
    period: normalizedPeriod,
    monthlyPayment: normalizedMonthlyPayment,
    summaryPayment: normalizedSummaryPayment,
    firstName,
    lastName,
    phone,
    firstPaymentDate,
    guarantorsCount: normalizedGuarantorsCount,
    guarantor1Phone,
    guarantor2Phone,
    storeName,
    sellerPhone,
    partnerId,
    partnerName,
  }
}

type RequestWithFiles = Request & {
  files?: Record<string, UploadedFile[] | undefined>
}

function validateOrderFiles(files: Record<string, UploadedFile[] | undefined>, guarantorsCount: number): OrderFilesInput | { error: string } {
  const buyerPassportMain = files.buyerPassportMain?.[0]
  const buyerPassportResidence = files.buyerPassportResidence?.[0]
  const buyerSelfie = files.buyerSelfie?.[0]
  const guarantor1PassportMain = files.guarantor1PassportMain?.[0]
  const guarantor1PassportResidence = files.guarantor1PassportResidence?.[0]
  const guarantor2PassportMain = files.guarantor2PassportMain?.[0]
  const guarantor2PassportResidence = files.guarantor2PassportResidence?.[0]
  const productPhoto = files.productPhoto?.[0]

  if (!buyerPassportMain || !buyerPassportResidence || !buyerSelfie || !guarantor1PassportMain || !guarantor1PassportResidence || !productPhoto) {
    return { error: 'Missing required photos' }
  }

  if (guarantorsCount === 2 && (!guarantor2PassportMain || !guarantor2PassportResidence)) {
    return { error: 'Second guarantor photos are required for this amount' }
  }

  return {
    buyerPassportMain,
    buyerPassportResidence,
    buyerSelfie,
    guarantor1PassportMain,
    guarantor1PassportResidence,
    guarantor2PassportMain,
    guarantor2PassportResidence,
    productPhoto,
  }
}

// POST /api/orders — create new order
router.post('/', uploadFields, async (req: Request, res: Response): Promise<void> => {
  console.log('[orders] POST /api/orders — incoming request')

  const requestWithFiles = req as RequestWithFiles
  const normalized = normalizeOrderInput(req.body as Record<string, unknown>)
  if ('error' in normalized) {
    console.warn('[orders] Validation failed (body):', normalized.error)
    res.status(400).json({ error: normalized.error })
    return
  }

  const fileKeys = Object.entries(requestWithFiles.files ?? {}).map(
    ([k, v]) => `${k}(${v?.length ?? 0})`,
  )
  console.log('[orders] Received files:', fileKeys.join(', ') || 'none')

  const validatedFiles = validateOrderFiles(
    requestWithFiles.files ?? {},
    normalized.guarantorsCount,
  )
  if ('error' in validatedFiles) {
    console.warn('[orders] Validation failed (files):', validatedFiles.error)
    res.status(400).json({ error: validatedFiles.error })
    return
  }

  let order
  try {
    // Prefer canonical partner name from DB when partnerId is known
    if (normalized.partnerId) {
      const partner = await getPartnerById(normalized.partnerId)
      if (partner) {
        normalized.partnerId = partner.id
        normalized.partnerName = partner.name
      }
    }

    order = await saveOrder(normalized, validatedFiles)
    console.log(`[orders] Order saved: ${order.id}`)
  } catch (err) {
    console.error('[orders] Failed to save order:', err)
    res.status(500).json({ error: 'Failed to save order' })
    return
  }

  // Send Telegram notification asynchronously — don't fail the request if it errors
  notifyNewOrder(order).catch((err) => {
    console.error(`[telegram] Notification failed for order ${order.id}:`, err)
  })

  res.status(201).json({ id: order.id, createdAt: order.createdAt })
})

// GET /api/orders — list orders (protected by API key)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const orders = await getOrders()
    // Return orders without file paths (metadata only)
    const sanitized = orders.map(({ buyerPassportMainPath, buyerPassportResidencePath, buyerSelfiePath, guarantor1PassportMainPath, guarantor1PassportResidencePath, guarantor2PassportMainPath, guarantor2PassportResidencePath, ...meta }) => meta)
    res.json(sanitized)
  } catch (err) {
    console.error('Failed to read orders:', err)
    res.status(500).json({ error: 'Failed to read orders' })
  }
})

export default router
