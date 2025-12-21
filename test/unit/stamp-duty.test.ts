import { describe, it, expect } from 'vitest'
import { calculateQLDStampDuty, solveAffordablePrice } from '~/composables/useStampDutyCalculator'

describe('calculateQLDStampDuty', () => {
  describe('standard duty brackets', () => {
    it('calculates duty for $500k property', () => {
      const result = calculateQLDStampDuty(500000, false, 'existing')
      // $75k-$540k bracket: $1,050 + (500000 - 75000) / 100 * 3.50 = $15,925
      expect(result.duty).toBe(15925)
    })
    
    it('calculates duty for $750k property', () => {
      const result = calculateQLDStampDuty(750000, false, 'existing')
      // $540k-$1M bracket: $17,325 + (750000 - 540000) / 100 * 4.50 = $26,775
      expect(result.duty).toBe(26775)
    })
  })
  
  describe('FHB concession - existing home', () => {
    it('full exemption at $700k', () => {
      const result = calculateQLDStampDuty(700000, true, 'existing')
      expect(result.duty).toBe(0)
      expect(result.concessionApplied).toBe(true)
    })
    
    it('phase-out at $750k', () => {
      const result = calculateQLDStampDuty(750000, true, 'existing')
      // (750000 - 700000) / 100 * 24.525 = $12,262.50 -> $12,263
      expect(result.duty).toBe(12263)
    })
    
    it('no concession at $800k+', () => {
      const result = calculateQLDStampDuty(850000, true, 'existing')
      expect(result.concessionApplied).toBe(false)
    })
  })
  
  describe('FHB concession - new home (May 2025+)', () => {
    it('full exemption regardless of price', () => {
      const result = calculateQLDStampDuty(1500000, true, 'new', '2025-06-01')
      expect(result.duty).toBe(0)
      expect(result.concessionApplied).toBe(true)
    })
    
    it('no exemption before May 2025 (if above thresholds)', () => {
      const result = calculateQLDStampDuty(800000, true, 'new', '2025-04-30')
      expect(result.concessionApplied).toBe(false)
    })
  })
})

describe('solveAffordablePrice', () => {
  it('converges to correct price after fees', () => {
    const budget = 800000
    const costs = {
      isFirstHomeBuyer: true,
      propertyType: 'existing' as const,
      legalCosts: 2000,
      buildingAndPest: 800,
      otherGovtCosts: 500
    }
    
    const result = solveAffordablePrice(budget, costs)
    
    // Verify: affordablePrice + stampDuty + fees = budget
    const total = result.affordablePrice + result.stampDuty + 2000 + 800 + 500
    expect(total).toBeCloseTo(budget, -1) // Within $10 due to rounding
  })
})
