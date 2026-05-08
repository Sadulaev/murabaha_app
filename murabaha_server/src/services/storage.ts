import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { Order, OrderFilesInput, OrderInput, OrderStatus, UploadedFile } from '../types/order'
import { getDb } from './db'

const DATA_DIR = path.join(process.cwd(), 'data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads', 'orders')

function ensureDataDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
}

function inferExtension(file: UploadedFile): string {
  if (file.mimetype === 'image/png') return 'png'
  if (file.mimetype === 'image/webp') return 'webp'
  if (file.mimetype === 'image/gif') return 'gif'
  return 'jpg'
}

function savePhoto(file: UploadedFile, dir: string, filenamePrefix: string): string {
  const extension = inferExtension(file)
  const filename = `${filenamePrefix}.${extension}`
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, file.buffer)
  return path.relative(DATA_DIR, filePath).replace(/\\/g, '/')
}

function mapRowToOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    createdAt: new Date(String(row.created_at)).toISOString(),
    status: (row.status as OrderStatus) ?? 'pending',
    cost: Number(row.cost),
    firstPayment: Number(row.first_payment),
    period: Number(row.period),
    monthlyPayment: Number(row.monthly_payment),
    summaryPayment: Number(row.summary_payment),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    phone: String(row.phone),
    firstPaymentDate: new Date(String(row.first_payment_date)).toISOString(),
    guarantorsCount: Number(row.guarantors_count),
    guarantor1Phone: String(row.guarantor1_phone ?? ''),
    guarantor2Phone: row.guarantor2_phone ? String(row.guarantor2_phone) : undefined,
    buyerPassportMainPath: String(row.buyer_passport_main_path),
    buyerPassportResidencePath: String(row.buyer_passport_residence_path),
    buyerSelfiePath: String(row.buyer_selfie_path),
    guarantor1PassportMainPath: String(row.guarantor1_passport_main_path),
    guarantor1PassportResidencePath: String(row.guarantor1_passport_residence_path),
    guarantor2PassportMainPath: row.guarantor2_passport_main_path ? String(row.guarantor2_passport_main_path) : undefined,
    guarantor2PassportResidencePath: row.guarantor2_passport_residence_path ? String(row.guarantor2_passport_residence_path) : undefined,
  }
}

export async function saveOrder(input: OrderInput, files: OrderFilesInput): Promise<Order> {
  ensureDataDir()

  const id = randomUUID()
  const orderDir = path.join(UPLOADS_DIR, id)
  fs.mkdirSync(orderDir, { recursive: true })

  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    status: 'pending',
    cost: input.cost,
    firstPayment: input.firstPayment,
    period: input.period,
    monthlyPayment: input.monthlyPayment,
    summaryPayment: input.summaryPayment,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    firstPaymentDate: input.firstPaymentDate,
    guarantorsCount: input.guarantorsCount,
    guarantor1Phone: input.guarantor1Phone,
    guarantor2Phone: input.guarantor2Phone,

    buyerPassportMainPath: savePhoto(files.buyerPassportMain, orderDir, 'buyer_passport_main'),
    buyerPassportResidencePath: savePhoto(files.buyerPassportResidence, orderDir, 'buyer_passport_residence'),
    buyerSelfiePath: savePhoto(files.buyerSelfie, orderDir, 'buyer_selfie'),
    guarantor1PassportMainPath: savePhoto(files.guarantor1PassportMain, orderDir, 'guarantor1_passport_main'),
    guarantor1PassportResidencePath: savePhoto(files.guarantor1PassportResidence, orderDir, 'guarantor1_passport_residence'),

    ...(files.guarantor2PassportMain && {
      guarantor2PassportMainPath: savePhoto(files.guarantor2PassportMain, orderDir, 'guarantor2_passport_main'),
    }),
    ...(files.guarantor2PassportResidence && {
      guarantor2PassportResidencePath: savePhoto(files.guarantor2PassportResidence, orderDir, 'guarantor2_passport_residence'),
    }),
  }

  try {
    const db = getDb()
    await db.query(
      `
        INSERT INTO orders (
          id,
          created_at,
          cost,
          first_payment,
          period,
          monthly_payment,
          summary_payment,
          first_name,
          last_name,
          phone,
          first_payment_date,
          guarantors_count,
          guarantor1_phone,
          guarantor2_phone,
          buyer_passport_main_path,
          buyer_passport_residence_path,
          buyer_selfie_path,
          guarantor1_passport_main_path,
          guarantor1_passport_residence_path,
          guarantor2_passport_main_path,
          guarantor2_passport_residence_path
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
      `,
      [
        order.id,
        order.createdAt,
        order.cost,
        order.firstPayment,
        order.period,
        order.monthlyPayment,
        order.summaryPayment,
        order.firstName,
        order.lastName,
        order.phone,
        order.firstPaymentDate,
        order.guarantorsCount,
        order.guarantor1Phone,
        order.guarantor2Phone ?? null,
        order.buyerPassportMainPath,
        order.buyerPassportResidencePath,
        order.buyerSelfiePath,
        order.guarantor1PassportMainPath,
        order.guarantor1PassportResidencePath,
        order.guarantor2PassportMainPath ?? null,
        order.guarantor2PassportResidencePath ?? null,
      ],
    )
  } catch (error) {
    fs.rmSync(orderDir, { recursive: true, force: true })
    throw error
  }

  return order
}

export async function getOrders(filters?: { status?: string; search?: string }): Promise<Order[]> {
  const db = getDb()
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.status) {
    params.push(filters.status)
    conditions.push(`status = $${params.length}`)
  }

  if (filters?.search) {
    const term = `%${filters.search.toLowerCase()}%`
    params.push(term)
    const i = params.length
    conditions.push(`(LOWER(id) LIKE $${i} OR LOWER(first_name) LIKE $${i} OR LOWER(last_name) LIKE $${i})`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await db.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, params)
  return result.rows.map((row: Record<string, unknown>) => mapRowToOrder(row))
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const db = getDb()
  const result = await db.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, id],
  )
  if (result.rows.length === 0) return null
  return mapRowToOrder(result.rows[0] as Record<string, unknown>)
}

export async function deleteOrderFiles(id: string): Promise<boolean> {
  const db = getDb()

  // Wipe file paths in DB
  const result = await db.query(
    `UPDATE orders SET
      buyer_passport_main_path = '',
      buyer_passport_residence_path = '',
      buyer_selfie_path = '',
      guarantor1_passport_main_path = '',
      guarantor1_passport_residence_path = '',
      guarantor2_passport_main_path = NULL,
      guarantor2_passport_residence_path = NULL
    WHERE id = $1`,
    [id],
  ) as unknown as { rowCount: number }
  if (result.rowCount === 0) return false

  // Remove files from disk
  const orderDir = path.join(UPLOADS_DIR, id)
  if (fs.existsSync(orderDir)) {
    fs.rmSync(orderDir, { recursive: true, force: true })
  }

  return true
}
