import { Pool } from 'pg'

let pool: Pool | null = null

function getConnectionString(): string {
  return process.env.DATABASE_URL || 'postgres://murabaha:murabaha@localhost:5432/murabaha'
}

export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
    })
  }

  return pool
}

export async function initDb(): Promise<void> {
  const db = getDb()

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      cost INTEGER NOT NULL,
      first_payment INTEGER NOT NULL,
      period INTEGER NOT NULL,
      monthly_payment INTEGER NOT NULL,
      summary_payment INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      first_payment_date DATE NOT NULL,
      guarantors_count INTEGER NOT NULL,
      buyer_passport_main_path TEXT NOT NULL,
      buyer_passport_residence_path TEXT NOT NULL,
      buyer_selfie_path TEXT NOT NULL,
      guarantor1_passport_main_path TEXT NOT NULL,
      guarantor1_passport_residence_path TEXT NOT NULL,
      guarantor2_passport_main_path TEXT,
      guarantor2_passport_residence_path TEXT
    )
  `)

  // Migration: add status column to existing tables
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  `)

  // Migration: add guarantor phone columns
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS guarantor1_phone TEXT NOT NULL DEFAULT ''
  `)
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS guarantor2_phone TEXT
  `)

  // Migration: add store name and product photo
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_name TEXT
  `)
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_photo_path TEXT
  `)

  // Migration: add seller phone
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_phone TEXT
  `)

  // Migration: partner referral on orders
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner_id TEXT
  `)
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner_name TEXT
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `)
}
