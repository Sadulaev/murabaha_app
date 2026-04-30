declare module 'multer' {
  import type { Request, RequestHandler } from 'express'

  export type MulterFile = {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    size: number
    buffer: Buffer
  }

  export type MulterCallback = (error: Error | null, acceptFile?: boolean) => void

  export type MulterOptions = {
    storage?: unknown
    limits?: {
      fileSize?: number
      files?: number
    }
    fileFilter?: (req: Request, file: MulterFile, callback: MulterCallback) => void
  }

  export type MulterField = {
    name: string
    maxCount?: number
  }

  export interface MulterInstance {
    fields(fields: MulterField[]): RequestHandler
  }

  export interface MulterFactory {
    (options?: MulterOptions): MulterInstance
    memoryStorage(): unknown
  }

  const multer: MulterFactory
  export default multer
}

declare module 'pg' {
  export type QueryResult<Row = Record<string, unknown>> = {
    rows: Row[]
  }

  export class Pool {
    constructor(options?: { connectionString?: string })
    query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<Row>>
  }
}
