import { describe, it, expect } from 'vitest'
import {
  isIncomeActiveOnDate,
  getActiveIncomeSources,
  countFortnightsInRange,
  getFinancialYear
} from '~/composables/useDateUtils'
import type { IncomeSource } from '~/types'

describe('isIncomeActiveOnDate', () => {
  it('returns true when no start or end date', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Salary',
      monthly: 5000,
      type: 'salary'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(true)
  })

  it('returns true when date is after start date', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Salary',
      monthly: 5000,
      type: 'salary',
      startDate: '2025-01-01'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(true)
  })

  it('returns true when date is before end date', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Salary',
      monthly: 5000,
      type: 'salary',
      endDate: '2025-12-31'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(true)
  })

  it('returns true when date is within start and end range', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Contract',
      monthly: 8000,
      type: 'salary',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(true)
  })

  it('returns false when date is before start date', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Future Job',
      monthly: 6000,
      type: 'salary',
      startDate: '2025-07-01'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(false)
  })

  it('returns false when date is after end date', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Old Job',
      monthly: 4000,
      type: 'salary',
      endDate: '2025-05-31'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(false)
  })

  it('handles exact start date', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Salary',
      monthly: 5000,
      type: 'salary',
      startDate: '2025-06-15'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(true)
  })

  it('handles exact end date', () => {
    const source: IncomeSource = {
      id: '1',
      name: 'Salary',
      monthly: 5000,
      type: 'salary',
      endDate: '2025-06-15'
    }
    const date = new Date('2025-06-15')
    expect(isIncomeActiveOnDate(source, date)).toBe(true)
  })
})

describe('getActiveIncomeSources', () => {
  const sources: IncomeSource[] = [
    { id: '1', name: 'Salary', monthly: 5000, type: 'salary' },
    { id: '2', name: 'Contract', monthly: 8000, type: 'salary', startDate: '2025-01-01', endDate: '2025-06-30' },
    { id: '3', name: 'Future Job', monthly: 6000, type: 'salary', startDate: '2025-07-01' },
    { id: '4', name: 'Old Job', monthly: 4000, type: 'salary', endDate: '2025-05-31' }
  ]

  it('filters to only active sources', () => {
    const date = new Date('2025-06-15')
    const active = getActiveIncomeSources(sources, date)
    expect(active).toHaveLength(2)
    expect(active.map(s => s.id)).toEqual(['1', '2'])
  })

  it('returns all sources when no date restrictions', () => {
    const date = new Date('2025-06-15')
    const allActiveSources: IncomeSource[] = [
      { id: '1', name: 'Salary', monthly: 5000, type: 'salary' },
      { id: '2', name: 'Contract', monthly: 8000, type: 'salary' }
    ]
    const active = getActiveIncomeSources(allActiveSources, date)
    expect(active).toHaveLength(2)
  })

  it('returns empty array when no sources active', () => {
    const futureSources: IncomeSource[] = [
      { id: '1', name: 'Future Job', monthly: 6000, type: 'salary', startDate: '2027-01-01' }
    ]
    const date = new Date('2026-01-15')
    const active = getActiveIncomeSources(futureSources, date)
    expect(active).toHaveLength(0)
  })

  it('handles sources with only start date', () => {
    const futureSources: IncomeSource[] = [
      { id: '1', name: 'Future Job', monthly: 6000, type: 'salary', startDate: '2025-07-01' }
    ]
    const date = new Date('2025-08-15')
    const active = getActiveIncomeSources(futureSources, date)
    expect(active).toHaveLength(1)
  })

  it('handles sources with only end date', () => {
    const pastSources: IncomeSource[] = [
      { id: '1', name: 'Past Job', monthly: 4000, type: 'salary', endDate: '2025-05-31' }
    ]
    const date = new Date('2025-05-15')
    const active = getActiveIncomeSources(pastSources, date)
    expect(active).toHaveLength(1)
  })
})

describe('countFortnightsInRange', () => {
  it('counts complete fortnights', () => {
    const anchor = new Date('2025-01-01') // Wednesday
    const start = new Date('2025-01-02')
    const end = new Date('2025-01-30') // ~4 weeks
    const result = countFortnightsInRange(anchor, start, end)
    expect(result.count).toBe(2)
    expect(result.partialFraction).toBeGreaterThanOrEqual(0)
    expect(result.partialFraction).toBeLessThanOrEqual(1)
  })

  it('handles zero fortnights when range is too short', () => {
    const anchor = new Date('2025-01-01')
    const start = new Date('2025-01-02')
    const end = new Date('2025-01-03')
    const result = countFortnightsInRange(anchor, start, end)
    expect(result.count).toBe(0)
  })

  it('calculates partial fraction for partial fortnight', () => {
    const anchor = new Date('2025-01-01')
    const start = new Date('2025-01-02')
    const end = new Date('2025-01-08') // ~6 days after anchor + 14 days
    const result = countFortnightsInRange(anchor, start, end)
    expect(result.partialFraction).toBeGreaterThan(0)
    expect(result.partialFraction).toBeLessThanOrEqual(1)
  })

  it('handles anchor before start date', () => {
    const anchor = new Date('2025-01-01')
    const start = new Date('2025-02-01')
    const end = new Date('2025-02-28')
    const result = countFortnightsInRange(anchor, start, end)
    expect(result.count).toBeGreaterThan(0)
  })

  it('handles start and end on same day', () => {
    const anchor = new Date('2025-01-01')
    const start = new Date('2025-01-15')
    const end = new Date('2025-01-15')
    const result = countFortnightsInRange(anchor, start, end)
    expect(result.count).toBe(0)
  })

  it('handles long ranges', () => {
    const anchor = new Date('2025-01-01')
    const start = new Date('2025-01-01')
    const end = new Date('2025-12-31')
    const result = countFortnightsInRange(anchor, start, end)
    expect(result.count).toBe(26) // Approx 52 weeks / 2
  })

  it('partial fraction is clamped between 0 and 1', () => {
    const anchor = new Date('2025-01-01')
    const start = new Date('2025-01-02')
    const end = new Date('2025-01-03')
    const result = countFortnightsInRange(anchor, start, end)
    expect(result.partialFraction).toBeGreaterThanOrEqual(0)
    expect(result.partialFraction).toBeLessThanOrEqual(1)
  })
})

describe('getFinancialYear', () => {
  describe('January to March (previous year fiscal)', () => {
    it('returns correct FY for January', () => {
      expect(getFinancialYear(new Date('2025-01-15'))).toBe('2024-25')
      expect(getFinancialYear(new Date('2025-01-31'))).toBe('2024-25')
    })

    it('returns correct FY for February', () => {
      expect(getFinancialYear(new Date('2025-02-15'))).toBe('2024-25')
    })

    it('returns correct FY for March', () => {
      expect(getFinancialYear(new Date('2025-03-15'))).toBe('2024-25')
      expect(getFinancialYear(new Date('2025-03-31'))).toBe('2024-25')
    })
  })

  describe('April onwards (current year fiscal)', () => {
    it('returns correct FY for April', () => {
      expect(getFinancialYear(new Date('2025-04-01'))).toBe('2025-26')
      expect(getFinancialYear(new Date('2025-04-15'))).toBe('2025-26')
    })

    it('returns correct FY for May', () => {
      expect(getFinancialYear(new Date('2025-05-15'))).toBe('2025-26')
    })

    it('returns correct FY for June', () => {
      expect(getFinancialYear(new Date('2025-06-15'))).toBe('2025-26')
      expect(getFinancialYear(new Date('2025-06-30'))).toBe('2025-26')
    })

    it('returns correct FY for July', () => {
      expect(getFinancialYear(new Date('2025-07-15'))).toBe('2025-26')
    })

    it('returns correct FY for December', () => {
      expect(getFinancialYear(new Date('2025-12-15'))).toBe('2025-26')
      expect(getFinancialYear(new Date('2025-12-31'))).toBe('2025-26')
    })
  })

  describe('year boundary handling', () => {
    it('handles March 31 (last day of previous FY)', () => {
      expect(getFinancialYear(new Date('2025-03-31'))).toBe('2024-25')
    })

    it('handles April 1 (first day of new FY)', () => {
      expect(getFinancialYear(new Date('2025-04-01'))).toBe('2025-26')
    })

    it('handles December 31 (last day of calendar year)', () => {
      expect(getFinancialYear(new Date('2025-12-31'))).toBe('2025-26')
    })

    it('handles January 1 (first day of calendar year)', () => {
      expect(getFinancialYear(new Date('2025-01-01'))).toBe('2024-25')
    })
  })

  it('defaults to current date when no date provided', () => {
    const result = getFinancialYear()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })

  it('handles leap year dates', () => {
    expect(getFinancialYear(new Date('2024-02-29'))).toBe('2023-24')
  })

  it('handles century transitions', () => {
    expect(getFinancialYear(new Date('1999-03-31'))).toBe('1998-99')
    expect(getFinancialYear(new Date('1999-04-01'))).toBe('1999-00')
    expect(getFinancialYear(new Date('2000-03-31'))).toBe('1999-00')
    expect(getFinancialYear(new Date('2000-04-01'))).toBe('2000-01')
  })
})
