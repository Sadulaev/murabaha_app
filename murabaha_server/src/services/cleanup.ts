import fs from 'fs'
import path from 'path'
import { getDb } from './db'

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads', 'orders')
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

export async function deleteOldPhotos(): Promise<void> {
  const db = getDb()
  const cutoff = new Date(Date.now() - RETENTION_MS)

  let rows: { id: string }[]
  try {
    const result = await db.query<{ id: string }>(
      'SELECT id FROM orders WHERE created_at < $1',
      [cutoff.toISOString()],
    )
    rows = result.rows
  } catch (err) {
    console.error('[cleanup] Failed to query old orders:', err)
    return
  }

  let deleted = 0
  for (const row of rows) {
    const dir = path.join(UPLOADS_DIR, row.id)
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
        deleted++
      } catch (err) {
        console.error(`[cleanup] Failed to delete dir ${dir}:`, err)
      }
    }
  }

  if (deleted > 0) {
    console.log(`[cleanup] Removed photos for ${deleted} order(s) older than 3 days`)
  }
}

const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function startCleanupCron(): void {
  // Run immediately on startup, then every 24 hours
  void deleteOldPhotos()
  setInterval(() => { void deleteOldPhotos() }, INTERVAL_MS)
  console.log('[cleanup] Photo cleanup cron started (runs every 24h)')
}
