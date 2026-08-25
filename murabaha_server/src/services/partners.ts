import { randomBytes } from 'crypto'
import type { Partner, PartnerInput } from '../types/partner'
import { getDb } from './db'

function mapRowToPartner(row: Record<string, unknown>): Partner {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

function generatePartnerId(): string {
  return randomBytes(6).toString('hex')
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  const db = getDb()
  const partner: Partner = {
    id: generatePartnerId(),
    name: input.name.trim(),
    createdAt: new Date().toISOString(),
  }

  await db.query(
    `INSERT INTO partners (id, name, created_at) VALUES ($1, $2, $3)`,
    [partner.id, partner.name, partner.createdAt],
  )

  return partner
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

export async function deletePartner(id: string): Promise<boolean> {
  const db = getDb()
  const result = await db.query(`DELETE FROM partners WHERE id = $1`, [id]) as unknown as { rowCount: number }
  return result.rowCount > 0
}
