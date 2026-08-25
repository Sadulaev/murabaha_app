import { Router, Request, Response } from 'express'
import { getPartnerById } from '../services/partners'

const router = Router()

// GET /api/partners/:id — public lookup for referral landing page
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
