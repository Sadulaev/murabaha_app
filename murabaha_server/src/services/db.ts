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

  // Migration: product category chosen in the calculator
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS category_id TEXT
  `)
  await db.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS category_name TEXT
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `)

  await db.query(`
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS slug TEXT
  `)
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_slug ON partners (slug)
  `)

  // Product categories: global (partner_id IS NULL) or per-partner catalogs
  await db.query(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      partner_id TEXT REFERENCES partners(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      include_first_payment_in_markup BOOLEAN NOT NULL DEFAULT TRUE,
      amount_min INTEGER NOT NULL DEFAULT 10000,
      amount_max INTEGER NOT NULL DEFAULT 300000,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `)

  await db.query(`
    ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS amount_min INTEGER NOT NULL DEFAULT 10000
  `)
  await db.query(`
    ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS amount_max INTEGER NOT NULL DEFAULT 300000
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_product_categories_partner
    ON product_categories (partner_id)
  `)

  // Per-term (month) calculator settings for a category — Excel-like table rows
  await db.query(`
    CREATE TABLE IF NOT EXISTS category_term_settings (
      category_id TEXT NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
      months INTEGER NOT NULL CHECK (months >= 1 AND months <= 24),
      markup_percent NUMERIC(8, 4),
      min_down_payment_percent NUMERIC(8, 4),
      PRIMARY KEY (category_id, months)
    )
  `)
}
