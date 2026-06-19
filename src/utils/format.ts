import type { CurrencyCode } from '../types'

const localeByCurrency: Record<CurrencyCode, string> = {
  NGN: 'en-NG',
  USD: 'en-US',
  GBP: 'en-GB'
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'NGN') {
  return new Intl.NumberFormat(localeByCurrency[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  }).format(amount)
}

export function formatNaira(amount: number) {
  return formatCurrency(amount, 'NGN')
}

export function parseMoney(value: string) {
  const normalized = value.replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseQuantity(value: string) {
  const parsed = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatTime(value = new Date()) {
  return value.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit'
  })
}
