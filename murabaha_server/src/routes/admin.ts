import { Router, Request, Response } from 'express'
import { deleteOrderFiles, getOrders, updateOrderStatus } from '../services/storage'
import { createPartner, deletePartner, getPartners } from '../services/partners'
import type { OrderStatus } from '../types/order'

const router = Router()

// Hardcoded admin credentials (server-side only)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'murabaha2024'

function verifyToken(req: Request): boolean {
  const apiKey = req.headers['x-api-key']
  return typeof apiKey === 'string' && apiKey === process.env.ADMIN_API_KEY
}

const VALID_STATUSES: OrderStatus[] = ['pending', 'in_progress', 'rejected']

// POST /api/admin/login — validate credentials and return the API token
router.post('/login', (req: Request, res: Response): void => {
  const body = req.body as Record<string, unknown>
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!username || !password) {
    res.status(400).json({ error: 'Укажите логин и пароль.' })
    return
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Неверный логин или пароль.' })
    return
  }

  const token = process.env.ADMIN_API_KEY
  if (!token) {
    res.status(500).json({ error: 'Admin token not configured on server.' })
    return
  }

  res.json({ token })
})

// GET /api/admin/orders?status=pending&search=ivan
router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined
    const orders = await getOrders({ status, search })
    res.json(orders)
  } catch (err) {
    console.error('Failed to read orders:', err)
    res.status(500).json({ error: 'Failed to read orders' })
  }
})

// PATCH /api/admin/orders/:id/status — update order status
router.patch('/orders/:id/status', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { id } = req.params
  const body = req.body as Record<string, unknown>
  const status = body.status

  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as OrderStatus)) {
    res.status(400).json({ error: `Недопустимый статус. Допустимые: ${VALID_STATUSES.join(', ')}` })
    return
  }

  try {
    const updated = await updateOrderStatus(id, status as OrderStatus)
    if (!updated) {
      res.status(404).json({ error: 'Заявка не найдена.' })
      return
    }
    res.json(updated)
  } catch (err) {
    console.error('Failed to update order status:', err)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

// DELETE /api/admin/orders/:id/files — delete all uploaded files for an order
router.delete('/orders/:id/files', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { id } = req.params

  try {
    const ok = await deleteOrderFiles(id)
    if (!ok) {
      res.status(404).json({ error: 'Заявка не найдена.' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete order files:', err)
    res.status(500).json({ error: 'Failed to delete files' })
  }
})

// GET /api/admin/partners — list partners
router.get('/partners', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const partners = await getPartners()
    res.json(partners)
  } catch (err) {
    console.error('Failed to read partners:', err)
    res.status(500).json({ error: 'Failed to read partners' })
  }
})

// POST /api/admin/partners — create partner
router.post('/partners', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const body = req.body as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!name) {
    res.status(400).json({ error: 'Укажите название партнёра.' })
    return
  }

  if (name.length > 120) {
    res.status(400).json({ error: 'Название партнёра слишком длинное.' })
    return
  }

  try {
    const partner = await createPartner({ name })
    res.status(201).json(partner)
  } catch (err) {
    console.error('Failed to create partner:', err)
    res.status(500).json({ error: 'Failed to create partner' })
  }
})

// DELETE /api/admin/partners/:id — delete partner
router.delete('/partners/:id', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { id } = req.params

  try {
    const ok = await deletePartner(id)
    if (!ok) {
      res.status(404).json({ error: 'Партнёр не найден.' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete partner:', err)
    res.status(500).json({ error: 'Failed to delete partner' })
  }
})

export default router
