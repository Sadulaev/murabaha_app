import fs from 'fs'
import path from 'path'
import type { Order } from '../types/order'

const DATA_DIR = path.join(process.cwd(), 'data')
const BASE_URL = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const CHAT_ID = () => process.env.TELEGRAM_CHANNEL_ID!

function hasTelegramConfig(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID)
}

async function sendMessage(text: string): Promise<void> {
  const res = await fetch(`${BASE_URL()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID(), text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`)
  }
}

async function sendPhoto(absolutePath: string, caption: string): Promise<void> {
  const fileBuffer = fs.readFileSync(absolutePath)
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' })
  const formData = new FormData()
  formData.append('chat_id', CHAT_ID())
  formData.append('photo', blob, path.basename(absolutePath))
  formData.append('caption', caption)
  formData.append('parse_mode', 'HTML')
  const res = await fetch(`${BASE_URL()}/sendPhoto`, { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram sendPhoto failed (${res.status}): ${body}`)
  }
}

async function sendMediaGroup(absolutePaths: string[], caption: string): Promise<void> {
  const formData = new FormData()
  formData.append('chat_id', CHAT_ID())

  const media = absolutePaths.map((filePath, i) => {
    const fieldName = `photo_${i}`
    const fileBuffer = fs.readFileSync(filePath)
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' })
    formData.append(fieldName, blob, path.basename(filePath))
    const item: Record<string, string> = { type: 'photo', media: `attach://${fieldName}` }
    if (i === 0) {
      item.caption = caption
      item.parse_mode = 'HTML'
    }
    return item
  })

  formData.append('media', JSON.stringify(media))

  const res = await fetch(`${BASE_URL()}/sendMediaGroup`, { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram sendMediaGroup failed (${res.status}): ${body}`)
  }
}

function formatRub(amount: number): string {
  return amount.toLocaleString('ru-RU') + ' руб'
}

export async function notifyNewOrder(order: Order): Promise<void> {
  if (!hasTelegramConfig()) {
    console.warn('[telegram] Skipping notification — TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set')
    return
  }

  console.log(`[telegram] Sending notification for order ${order.id} to chat ${CHAT_ID()}`)

  const paymentDate = new Date(order.firstPaymentDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const createdAt = new Date(order.createdAt).toLocaleString('ru-RU')

  const caption = [
    '🆕 <b>Новая заявка на рассрочку</b>',
    '',
    `👤 <b>Покупатель:</b> ${order.firstName} ${order.lastName}`,
    `📞 <b>Телефон:</b> ${order.phone}`,
    `📅 <b>Дата первого платежа:</b> ${paymentDate}`,
    ...(order.storeName ? [`🏪 <b>Магазин:</b> ${order.storeName}`] : []),
    ...(order.sellerPhone ? [`📞 <b>Номер продавца:</b> ${order.sellerPhone}`] : []),
    '',,
    `👥 <b>Поручитель 1:</b> ${order.guarantor1Phone || '—'}`,
    ...(order.guarantor2Phone ? [`👥 <b>Поручитель 2:</b> ${order.guarantor2Phone}`] : []),
    '',
    '💰 <b>Параметры рассрочки:</b>',
    `• Стоимость товара: ${formatRub(order.cost)}`,
    `• Первоначальный взнос: ${formatRub(order.firstPayment)}`,
    `• Срок: ${order.period} мес.`,
    `• Ежемесячный платёж: ${formatRub(order.monthlyPayment)}`,
    `• Итоговая сумма: ${formatRub(order.summaryPayment)}`,
    `• Поручителей: ${order.guarantorsCount}`,
    '',
    `🆔 <b>ID заявки:</b> <code>${order.id}</code>`,
    `🕐 <b>Создана:</b> ${createdAt}`,
  ].join('\n')

  const photoPaths = [
    order.buyerPassportMainPath,
    order.buyerPassportResidencePath,
    order.buyerSelfiePath,
    order.guarantor1PassportMainPath,
    order.guarantor1PassportResidencePath,
    order.guarantor2PassportMainPath,
    order.guarantor2PassportResidencePath,
    order.productPhotoPath,
  ]
    .filter((p): p is string => Boolean(p))
    .map(p => path.join(DATA_DIR, p))

  console.log(`[telegram] Photos to send: ${photoPaths.length}`)

  try {
    if (photoPaths.length === 0) {
      // No photos — send text only
      await sendMessage(caption)
      console.log(`[telegram] Text-only message sent for order ${order.id}`)
    } else if (photoPaths.length === 1) {
      // Single photo — sendPhoto with caption
      await sendPhoto(photoPaths[0], caption)
      console.log(`[telegram] Single photo with caption sent for order ${order.id}`)
    } else {
      // Multiple photos — send as album with caption on first photo
      await sendMediaGroup(photoPaths, caption)
      console.log(`[telegram] Media group (${photoPaths.length} photos) sent for order ${order.id}`)
    }
  } catch (err) {
    console.error(`[telegram] Notification failed for order ${order.id}:`, err)
    const cause = (err instanceof Error) ? (err as Error & { cause?: unknown }).cause : undefined
    const aggregate = (err instanceof AggregateError) ? err : (cause instanceof AggregateError) ? cause : null
    if (aggregate && Array.isArray(aggregate.errors)) {
      for (const nested of aggregate.errors) {
        console.error(`[telegram]   └─`, nested)
      }
    }
  }

  console.log(`[telegram] Notification complete for order ${order.id}`)
}
