export function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString('en-NG')}`
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
