export function formatCurrency(amount: any, options?: { abbrev?: boolean; decimals?: number; currency?: string } | string): string {
  const num = Number(amount)
  if (amount === null || amount === undefined || isNaN(num)) return '$0'
  
  // Support passing currency code as second arg for convenience
  const opts = typeof options === 'string' ? { currency: options } : options
  const { abbrev = false, decimals = 0, currency = 'AUD' } = opts || {}
  const abs = Math.abs(num)

  if (abbrev && abs >= 1_000_000) {
      return '$' + (num / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + 'M'
  }
  if (abbrev && abs >= 1_000) {
      return '$' + (num / 1_000).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + 'k'
  }
  const absValue = Math.abs(num)
  const formatted = absValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const sign = num < 0 ? '-' : ''
  if (currency === 'AUD') return sign + '$' + formatted
  return sign + currency + '\u00A0' + formatted
}

export function formatPercentage(p: number, decimals = 1): string {
  // force between 0 and 1
  const clamped = Math.max(0, Math.min(1, p))
  return (clamped * 100).toFixed(decimals) + '%'
}

export function formatCompactCurrency(monthlyOrAnnual: number): string {
  // pick sensible unit based on magnitude
  const abs = Math.abs(monthlyOrAnnual)
  if (abs >= 1_000_000) return formatCurrency(monthlyOrAnnual / 1_000_000) + 'M'
  if (abs >= 1_000) return formatCurrency(monthlyOrAnnual / 1_000) + 'k'
  return formatCurrency(monthlyOrAnnual)
}

export function formatMonths(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y && m) return `${y}y ${m}m`
  if (y) return `${y}y`
  return `${m}m`
}

export function formatDateLabel(dateStr: string, format: 'short' | 'full' = 'short'): string {
  const date = new Date(dateStr)
  if (format === 'full') {
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}
