import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercentage,
  formatCompactCurrency,
  formatMonths,
  formatDateLabel
} from '~/composables/useFormatter'

describe('formatCurrency', () => {
  describe('with abbreviations', () => {
    it('abbreviates to M for millions', () => {
      expect(formatCurrency(1_500_000, { abbrev: true, decimals: 1 })).toBe('$1.5M')
      expect(formatCurrency(10_000_000, { abbrev: true })).toBe('$10M')
    })

    it('abbreviates to k for thousands', () => {
      expect(formatCurrency(1_500, { abbrev: true, decimals: 1 })).toBe('$1.5k')
      expect(formatCurrency(10_000, { abbrev: true })).toBe('$10k')
    })

    it('handles values below 1_000 without abbreviation', () => {
      expect(formatCurrency(500, { abbrev: true })).toBe('$500')
    })

    it('handles negative values with abbreviation', () => {
      expect(formatCurrency(-1_500_000, { abbrev: true, decimals: 1 })).toBe('$-1.5M')
      expect(formatCurrency(-1_500, { abbrev: true, decimals: 1 })).toBe('$-1.5k')
    })
  })

  describe('decimal formatting', () => {
    it('formats with specified decimals', () => {
      expect(formatCurrency(1500, { abbrev: true, decimals: 2 })).toBe('$1.50k')
      expect(formatCurrency(1500000, { abbrev: true, decimals: 2 })).toBe('$1.50M')
    })

    it('rounds decimals correctly', () => {
      expect(formatCurrency(1234.567, { decimals: 2 })).toBe('$1,234.57')
      expect(formatCurrency(1234.567, { decimals: 1 })).toBe('$1,234.6')
    })
  })

  describe('currency codes', () => {
    it('accepts currency code in options object', () => {
      expect(formatCurrency(1000, { currency: 'USD' })).toBe('USD\u00A01,000')
    })

    it('accepts currency code as string for convenience', () => {
      expect(formatCurrency(1000, 'USD')).toBe('USD\u00A01,000')
    })

    it('defaults to AUD', () => {
      expect(formatCurrency(1000)).toBe('$1,000')
    })
  })

  describe('edge cases', () => {
    it('returns $0 for null', () => {
      expect(formatCurrency(null)).toBe('$0')
    })

    it('returns $0 for undefined', () => {
      expect(formatCurrency(undefined)).toBe('$0')
    })

    it('returns $0 for NaN', () => {
      expect(formatCurrency(NaN)).toBe('$0')
    })

    it('handles zero', () => {
      expect(formatCurrency(0)).toBe('$0')
    })

    it('handles negative values', () => {
      expect(formatCurrency(-100)).toBe('-$100')
    })

    it('handles string numbers', () => {
      expect(formatCurrency('1000')).toBe('$1,000')
    })
  })
})

describe('formatPercentage', () => {
  it('converts decimal to percentage', () => {
    expect(formatPercentage(0.05)).toBe('5.0%')
    expect(formatPercentage(0.123)).toBe('12.3%')
  })

  it('handles zero', () => {
    expect(formatPercentage(0)).toBe('0.0%')
  })

  it('handles one (100%)', () => {
    expect(formatPercentage(1)).toBe('100.0%')
  })

  it('clamps values above 1 to 100%', () => {
    expect(formatPercentage(1.5)).toBe('100.0%')
    expect(formatPercentage(2)).toBe('100.0%')
  })

  it('clamps negative values to 0%', () => {
    expect(formatPercentage(-0.1)).toBe('0.0%')
    expect(formatPercentage(-1)).toBe('0.0%')
  })

  it('respects decimals parameter', () => {
    expect(formatPercentage(0.05, 2)).toBe('5.00%')
    expect(formatPercentage(0.12345, 3)).toBe('12.345%')
  })
})

describe('formatCompactCurrency', () => {
  it('formats millions with M suffix', () => {
    expect(formatCompactCurrency(1_500_000)).toBe('$2M')
    expect(formatCompactCurrency(-1_500_000)).toBe('-$2M')
  })

  it('formats thousands with k suffix', () => {
    expect(formatCompactCurrency(1_500)).toBe('$2k')
    expect(formatCompactCurrency(-1_500)).toBe('-$2k')
  })

  it('formats small values without suffix', () => {
    expect(formatCompactCurrency(100)).toBe('$100')
    expect(formatCompactCurrency(500)).toBe('$500')
  })

  it('handles edge cases', () => {
    expect(formatCompactCurrency(0)).toBe('$0')
    expect(formatCompactCurrency(999)).toBe('$999')
    expect(formatCompactCurrency(1_000)).toBe('$1k')
    expect(formatCompactCurrency(1_000_000)).toBe('$1M')
  })
})

describe('formatMonths', () => {
  it('formats years and months', () => {
    expect(formatMonths(14)).toBe('1y 2m')
    expect(formatMonths(25)).toBe('2y 1m')
  })

  it('formats whole years', () => {
    expect(formatMonths(12)).toBe('1y')
    expect(formatMonths(24)).toBe('2y')
    expect(formatMonths(36)).toBe('3y')
  })

  it('formats months only', () => {
    expect(formatMonths(6)).toBe('6m')
    expect(formatMonths(11)).toBe('11m')
  })

  it('handles edge cases', () => {
    expect(formatMonths(0)).toBe('0m')
    expect(formatMonths(1)).toBe('1m')
    expect(formatMonths(12)).toBe('1y')
    expect(formatMonths(13)).toBe('1y 1m')
  })
})

describe('formatDateLabel', () => {
  describe('short format', () => {
    it('formats date to short format (month year)', () => {
      expect(formatDateLabel('2025-01-15')).toBe('Jan 2025')
      expect(formatDateLabel('2025-12-31')).toBe('Dec 2025')
    })

    it('uses short format by default', () => {
      expect(formatDateLabel('2025-06-15', 'short')).toBe('June 2025')
    })
  })

  describe('full format', () => {
    it('formats date to full format (day month year)', () => {
      expect(formatDateLabel('2025-01-15', 'full')).toBe('15 Jan 2025')
      expect(formatDateLabel('2025-12-31', 'full')).toBe('31 Dec 2025')
    })
  })

  it('handles different date formats', () => {
    expect(formatDateLabel('2025/06/15', 'short')).toBe('June 2025')
    expect(formatDateLabel('06-15-2025', 'short')).toBe('June 2025')
  })
})
