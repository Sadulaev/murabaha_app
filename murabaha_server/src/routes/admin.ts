import { Router, Request, Response } from 'express'
import { getOrders } from '../services/storage'

const router = Router()

// Hardcoded admin credentials (server-side only)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'murabaha2024'

function verifyToken(req: Request): boolean {
  const apiKey = req.headers['x-api-key']
  return typeof apiKey === 'string' && apiKey === process.env.ADMIN_API_KEY
}

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

// GET /api/admin/orders — list all orders with full file path info
router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  if (!verifyToken(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const orders = await getOrders()
    res.json(orders)
  } catch (err) {
    console.error('Failed to read orders:', err)
    res.status(500).json({ error: 'Failed to read orders' })
  }
})

export default router
