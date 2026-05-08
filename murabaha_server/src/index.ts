import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import ordersRouter from './routes/orders'
import adminRouter from './routes/admin'
import { initDb } from './services/db'
import { startCleanupCron } from './services/cleanup'

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
}))

// Request logger
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m'
    console.log(`${color}[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)\x1b[0m`)
  })
  next()
})

// Increase limit for base64 photo payloads
app.use(express.json({ limit: '50mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/uploads', express.static(path.join(process.cwd(), 'data', 'uploads')))
app.use('/api/orders', ordersRouter)
app.use('/api/admin', adminRouter)

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Murabaha server running on http://localhost:${PORT}`)
    })
    startCleanupCron()
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  })
