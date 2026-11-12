export interface Partner {
  id: string
  name: string
  /** Latin URL segment: `/ur/{slug}`. */
  slug: string
  createdAt: string
}

export interface PartnerInput {
  name: string
}
