export function formatCurrency(amount: number, options?: { abbrev?: boolean; decimals?: number }): string {
  const { abbrev = false, decimals = 0 } = options || {}
  const abs = Math.abs(amount)

  if (abbrev && abs >= 1_000_000) {
      return '$' + (amount / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + 'M'
  }
  if (abbrev && abs >= 1_000) {
      return '$' + (amount / 1_000).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + 'k'
  }
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    style: 'currency',
    currency: 'AUD',
  })
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
