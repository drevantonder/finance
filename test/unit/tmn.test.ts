import { describe, it, expect } from 'vitest'
import { 
  STRATEGY_LEVY_PCT,
  PTC_LEVY_PCT,
  REQUIRED_SUPER_PCT,
  WORKERS_COMP_PCT,
  calculateFPForValue, 
  calculateIncomeBreakdown 
} from '~/composables/useTmnCalculator'

describe('useTmnCalculator', () => {
  describe('constants', () => {
    it('uses correct levy rates', () => {
      expect(PTC_LEVY_PCT).toBe(0.10)       // 10%
      expect(STRATEGY_LEVY_PCT).toBe(0.02) // 2%
      expect(REQUIRED_SUPER_PCT).toBe(0.115)       // 11.5%
      expect(WORKERS_COMP_PCT).toBe(0.017) // 1.7%
    })
  })
  
  describe('calculateFPForValue', () => {
    it('calculates FP correctly after levies', () => {
      // TMN = $10,000
      // PTC = 10% of TMN = $1,000
      // FP + MMR + Strategy + WorkersComp = $9,000
      // MMR = $500
      // Strategy = 0.02 * (FP + MMR)
      // WorkersComp = 0.017 * FP
      // FP + 0.02 * (FP + 500) + 500 + 0.017 * FP = 9000
      // 1.037 * FP + 510 = 9000
      // 1.037 * FP = 8490
      // FP = 8187.08
      const fp = calculateFPForValue(10000, 500, 0)
      expect(fp).toBeCloseTo(8187.08, 1)
    })
  })
  
  describe('income split', () => {
    it('splits FP into super and salary package, then 50/50', () => {
      const fp = 6690 // $6690 FP
      // salaryPackage = 6690 / 1.115 = 6000
      // taxableIncome = 3000
      // mfb = 3000
      const result = calculateIncomeBreakdown(fp)
      
      expect(result.salaryPackage).toBeCloseTo(6000, 0)
      expect(result.taxableIncome).toBeCloseTo(3000, 0)
      expect(result.mfb).toBeCloseTo(3000, 0)
    })
  })
})
