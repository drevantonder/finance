import { describe, it, expect } from 'vitest'
import { calculateIncomeTax, calculateHecsRepayment, getIncomeYear } from '~/composables/useTaxCalculator'

describe('calculateIncomeTax', () => {
  it('returns $0 for income below tax-free threshold', () => {
    expect(calculateIncomeTax(18200)).toBe(0)
  })
  
  it('calculates 16% bracket correctly', () => {
    // $45,000 income: (45000 - 18200) * 0.16 = $4,288 tax
    // Medicare Levy (2%): 45000 * 0.02 = 900
    // Total: 5188
    const tax = calculateIncomeTax(45000)
    expect(tax).toBeCloseTo(5188, 0)
  })
  
  it('calculates $100k income correctly', () => {
    // $100k: (100000 - 45000) * 0.30 + 4288 = 16500 + 4288 = 20788
    // Medicare: 2000
    // Total: 22788
    const tax = calculateIncomeTax(100000)
    expect(tax).toBeCloseTo(22788, 0)
  })
})

describe('calculateHecsRepayment', () => {
  it('returns $0 below threshold', () => {
    expect(calculateHecsRepayment(67000, '2025-26')).toBe(0)
  })
  
  it('calculates tier 1 correctly (15% marginal)', () => {
    // $80,000: (80000 - 67000) * 0.15 = $1,950
    expect(calculateHecsRepayment(80000, '2025-26')).toBe(1950)
  })
  
  it('calculates tier 2 correctly', () => {
    // $150,000: $8,700 + (150000 - 125000) * 0.17 = $8,700 + $4,250 = $12,950
    expect(calculateHecsRepayment(150000, '2025-26')).toBe(12950)
  })
  
  it('calculates tier 3 correctly (10% of total)', () => {
    // $200,000: 200000 * 0.10 = $20,000
    expect(calculateHecsRepayment(200000, '2025-26')).toBe(20000)
  })
  
  it('falls back to default year for unknown income years', () => {
    // 2027-28 should use 2025-26 thresholds
    expect(calculateHecsRepayment(80000, '2027-28')).toBe(1950)
  })
})

describe('getIncomeYear', () => {
  it('returns 2025-26 for dates in July 2025 - June 2026', () => {
    expect(getIncomeYear(new Date('2025-07-01'))).toBe('2025-26')
    expect(getIncomeYear(new Date('2026-06-30'))).toBe('2025-26')
  })
  
  it('returns 2026-27 for dates in July 2026 onwards', () => {
    expect(getIncomeYear(new Date('2026-07-01'))).toBe('2026-27')
    expect(getIncomeYear(new Date('2027-03-01'))).toBe('2026-27')
  })
})
