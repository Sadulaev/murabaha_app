import { Router, Request, Response } from 'express'
import { getPartnerById, getPartnerBySlug } from '../services/partners'

const router = Router()

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// GET /api/partners/by-slug/:slug — public lookup for /ur/{slug} landing
router.get('/by-slug/:slug', async (req: Request, res: Response): Promise<void> => {
  const slug = req.params.slug.trim().toLowerCase()

  if (!slug || slug.length > 96 || !SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: 'Invalid partner slug' })
    return
  }

  try {
    const partner = await getPartnerBySlug(slug)
    if (!partner) {
      res.status(404).json({ error: 'Partner not found' })
      return
    }
    res.json({ id: partner.id, name: partner.name, slug: partner.slug })
  } catch (err) {
    console.error('Failed to read partner by slug:', err)
    res.status(500).json({ error: 'Failed to read partner' })
  }
})

// GET /api/partners/:id — public lookup for legacy ?p= links
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  if (!id || !/^[a-f0-9]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Invalid partner id' })
    return
  }

  try {
    const partner = await getPartnerById(id)
    if (!partner) {
      res.status(404).json({ error: 'Partner not found' })
      return
    }
    res.json({ id: partner.id, name: partner.name })
  } catch (err) {
    console.error('Failed to read partner:', err)
    res.status(500).json({ error: 'Failed to read partner' })
  }
})

export default router
