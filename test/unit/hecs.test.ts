import { describe, it, expect } from 'vitest'
import { 
  projectHecsBalance, 
  calculatePersonRepaymentIncome,
  getIndexationDate,
  getIncomeYearEndDate
} from '~/composables/useHecsCalculator'
import type { IncomeSource, HecsDebt } from '~/types'

describe('useHecsCalculator', () => {
  describe('calculatePersonRepaymentIncome', () => {
    it('sums multiple income sources correctly', () => {
      const personId = 'p1'
      const sources: IncomeSource[] = [
        {
          id: 's1',
          personId,
          name: 'Job 1',
          type: 'salary',
          startDate: null,
          endDate: null,
          salary: { grossAnnual: 80000 }
        },
        {
          id: 's2',
          personId,
          name: 'Job 2',
          type: 'salary',
          startDate: null,
          endDate: null,
          salary: { grossAnnual: 20000 }
        }
      ]
      
      const income = calculatePersonRepaymentIncome(personId, sources)
      expect(income).toBe(100000)
    })

    it('includes taxable Centrelink', () => {
      const personId = 'p1'
      const sources: IncomeSource[] = [
        {
          id: 's1',
          personId,
          name: 'JobSeeker',
          type: 'centrelink',
          startDate: null,
          endDate: null,
          centrelink: { fortnightlyAmount: 700, paymentType: 'JobSeeker', taxable: true }
        }
      ]
      const income = calculatePersonRepaymentIncome(personId, sources)
      expect(income).toBe(700 * 26)
    })

    it('excludes non-taxable Centrelink', () => {
      const personId = 'p1'
      const sources: IncomeSource[] = [
        {
          id: 's1',
          personId,
          name: 'FTB',
          type: 'centrelink',
          startDate: null,
          endDate: null,
          centrelink: { fortnightlyAmount: 500, paymentType: 'FTB', taxable: false }
        }
      ]
      const income = calculatePersonRepaymentIncome(personId, sources)
      expect(income).toBe(0)
    })
  })

  describe('projectHecsBalance', () => {
    const defaultHecs: HecsDebt = {
      balance: 10000,
      balanceAsOfDate: '2025-07-01',
      indexationRate: 0 // No indexation for simple repayment test
    }

    const highIncome: IncomeSource[] = [
      {
        id: 's1',
        personId: 'p1',
        name: 'High Income',
        type: 'salary',
        startDate: null,
        endDate: null,
        salary: { grossAnnual: 120000 }
      }
    ]

    it('projects simple repayments correctly', () => {
      // $120,000 income year 2025-26:
      // Repayment = (120000 - 67000) * 0.15 = 53000 * 0.15 = 7950 annual
      // Monthly = 7950 / 12 = 662.5
      
      // Project 6 months: July to Dec (end of month dec 31)
      const targetDate = '2026-01-01'
      const result = projectHecsBalance(defaultHecs, targetDate, highIncome, 'p1')
      
      expect(result.totalRepayments).toBeCloseTo(662.5 * 6, 0)
      expect(result.projectedBalance).toBeCloseTo(10000 - (662.5 * 6), 0)
    })

    it('applies indexation on June 1st', () => {
      const hecsWithIndex: HecsDebt = {
        balance: 10000,
        balanceAsOfDate: '2025-05-01',
        indexationRate: 0.04
      }
      
      // Project 2 months (May and June)
      // June 1st falls in between.
      // Balance starts at 10k.
      // May repayment happens? BalanceAsOf is May 1st.
      // Loop starts May. 
      // Month 1 (May): Repayment
      // Month 2 (June): Repayment + Indexation
      const targetDate = '2025-07-01'
      
      // Assume low income for no repayments to isolate indexation
      const lowIncome: IncomeSource[] = []
      
      const result = projectHecsBalance(hecsWithIndex, targetDate, lowIncome, 'p1')
      expect(result.totalIndexation).toBe(10000 * 0.04)
      expect(result.projectedBalance).toBe(10400)
    })

    it('applies scheduled additions on the correct dates', () => {
      const hecsWithAdditions: HecsDebt = {
        balance: 10000,
        balanceAsOfDate: '2025-01-01',
        indexationRate: 0,
        scheduledAdditions: [
          { id: 'a1', date: '2025-03-31', amount: 5000, description: 'Sem 1' },
          { id: 'a2', date: '2025-08-31', amount: 5000, description: 'Sem 2' }
        ]
      }
      
      const noIncome: IncomeSource[] = []
      
      // Project until April (should include first addition)
      const aprilTarget = '2025-05-01'
      const result1 = projectHecsBalance(hecsWithAdditions, aprilTarget, noIncome, 'p1')
      expect(result1.totalAdditions).toBe(5000)
      expect(result1.projectedBalance).toBe(15000)

      // Project until September (should include both additions)
      const septTarget = '2025-10-01'
      const result2 = projectHecsBalance(hecsWithAdditions, septTarget, noIncome, 'p1')
      expect(result2.totalAdditions).toBe(10000)
      expect(result2.projectedBalance).toBe(20000)
    })
  })

  describe('dates', () => {
    it('calculates indexation date correctly', () => {
      expect(getIndexationDate('2025-26').toISOString()).toContain('2026-06-01')
    })
    
    it('calculates year end correctly', () => {
      expect(getIncomeYearEndDate('2025-26').toISOString()).toContain('2026-06-30')
    })
  })
})
