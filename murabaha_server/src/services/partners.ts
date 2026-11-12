import { randomBytes } from 'crypto'
import type { Partner, PartnerInput } from '../types/partner'
import { getDb } from './db'

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ї: 'yi',
  є: 'ye',
  ґ: 'g',
  ў: 'u',
}

/** Full partner name as a lowercase latin URL segment, words separated by hyphens. */
export function transliterateToSlug(name: string): string {
  const lower = name.trim().toLowerCase()
  let out = ''
  for (const ch of lower) {
    if (ch in CYRILLIC_TO_LATIN) {
      out += CYRILLIC_TO_LATIN[ch]
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch
    } else if (/[\s_-]/.test(ch)) {
      out += '-'
    }
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

function mapRowToPartner(row: Record<string, unknown>): Partner {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug ?? ''),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505'
}

async function allocateSlug(base: string): Promise<string> {
  const db = getDb()
  const root = base || 'partner'
  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? root : `${root}-${index + 1}`
    const existing = await db.query(`SELECT 1 FROM partners WHERE slug = $1`, [candidate])
    if (existing.rows.length === 0) return candidate
  }
  return `${root}-${randomBytes(3).toString('hex')}`
}

/** Fills `slug` for partners created before latin referral links existed. */
export async function backfillPartnerSlugs(): Promise<void> {
  const db = getDb()
  const result = await db.query(
    `SELECT id, name FROM partners WHERE slug IS NULL OR slug = '' ORDER BY created_at ASC`,
  )
  for (const row of result.rows as Array<{ id: string; name: string }>) {
    const base = transliterateToSlug(String(row.name)) || String(row.id)
    const slug = await allocateSlug(base)
    await db.query(`UPDATE partners SET slug = $2 WHERE id = $1 AND (slug IS NULL OR slug = '')`, [
      row.id,
      slug,
    ])
  }
}

function generatePartnerId(): string {
  return randomBytes(6).toString('hex')
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  const db = getDb()
  const name = input.name.trim()
  const id = generatePartnerId()
  const base = transliterateToSlug(name) || id

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const partner: Partner = {
      id: attempt === 0 ? id : generatePartnerId(),
      name,
      slug: await allocateSlug(attempt === 0 ? base : transliterateToSlug(name) || id),
      createdAt: new Date().toISOString(),
    }

    try {
      await db.query(
        `INSERT INTO partners (id, name, slug, created_at) VALUES ($1, $2, $3, $4)`,
        [partner.id, partner.name, partner.slug, partner.createdAt],
      )
      return partner
    } catch (err) {
      if (!isUniqueViolation(err) || attempt === 4) throw err
    }
  }

  throw new Error('Failed to allocate partner slug')
}

export async function getPartners(): Promise<Partner[]> {
  const db = getDb()
  const result = await db.query(`SELECT * FROM partners ORDER BY created_at DESC`)
  return result.rows.map((row: Record<string, unknown>) => mapRowToPartner(row))
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const db = getDb()
  const result = await db.query(`SELECT * FROM partners WHERE id = $1`, [id])
  if (result.rows.length === 0) return null
  return mapRowToPartner(result.rows[0] as Record<string, unknown>)
}

export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const db = getDb()
  const result = await db.query(`SELECT * FROM partners WHERE slug = $1`, [slug])
  if (result.rows.length === 0) return null
  return mapRowToPartner(result.rows[0] as Record<string, unknown>)
}

export async function deletePartner(id: string): Promise<boolean> {
  const db = getDb()
  // product_categories.partner_id has ON DELETE CASCADE → term settings cascade too
  const result = await db.query(`DELETE FROM partners WHERE id = $1`, [id]) as unknown as { rowCount: number }
  return result.rowCount > 0
}
