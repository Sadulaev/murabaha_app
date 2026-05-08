export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

export interface OrderInput {
  cost: number
  firstPayment: number
  period: number
  monthlyPayment: number
  summaryPayment: number
  firstName: string
  lastName: string
  phone: string
  firstPaymentDate: string // ISO date string
  guarantorsCount: number
  guarantor1Phone: string
  guarantor2Phone?: string
  storeName?: string
}

export interface OrderFilesInput {
  buyerPassportMain: UploadedFile
  buyerPassportResidence: UploadedFile
  buyerSelfie: UploadedFile
  guarantor1PassportMain: UploadedFile
  guarantor1PassportResidence: UploadedFile
  guarantor2PassportMain?: UploadedFile
  guarantor2PassportResidence?: UploadedFile
  productPhoto?: UploadedFile
}

export type OrderStatus = 'pending' | 'in_progress' | 'rejected'

export interface Order {
  id: string
  createdAt: string
  status: OrderStatus
  cost: number
  firstPayment: number
  period: number
  monthlyPayment: number
  summaryPayment: number
  firstName: string
  lastName: string
  phone: string
  firstPaymentDate: string
  guarantorsCount: number

  guarantor1Phone: string
  guarantor2Phone?: string

  storeName?: string

  buyerPassportMainPath: string
  buyerPassportResidencePath: string
  buyerSelfiePath: string
  guarantor1PassportMainPath: string
  guarantor1PassportResidencePath: string
  guarantor2PassportMainPath?: string
  guarantor2PassportResidencePath?: string
  productPhotoPath?: string
}
