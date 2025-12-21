import type { PropertyType, CostsConfig } from '~/types'

/**
 * Calculate QLD Transfer Duty (Stamp Duty)
 * Based on 2024-2025 rates and First Home Buyer concessions.
 */
export function calculateQLDStampDuty(
  price: number,
  isFirstHomeBuyer: boolean,
  propertyType: PropertyType = 'existing',
  contractDate?: string
) {
  if (price <= 5000) return { duty: 0, concessionApplied: false, concessionAmount: 0 }

  const date = contractDate ? new Date(contractDate) : new Date()
  const may2025 = new Date('2025-05-01')

  // 1. Calculate Standard Duty
  let standardDuty = 0
  if (price > 1000000) {
    standardDuty = 38025 + (Math.ceil((price - 1000000) / 100) * 5.75)
  } else if (price > 540000) {
    standardDuty = 17325 + (Math.ceil((price - 540000) / 100) * 4.50)
  } else if (price > 75000) {
    standardDuty = 1050 + (Math.ceil((price - 75000) / 100) * 3.50)
  } else if (price > 5000) {
    standardDuty = (Math.ceil((price - 5000) / 100) * 1.50)
  }

  // 2. Apply First Home Buyer Concessions
  let finalDuty = standardDuty
  let concessionApplied = false

  if (isFirstHomeBuyer) {
    // New rules from May 1, 2024 (effective date might be different but let's stick to the prompt's May 2025 logic for simplicity if requested, 
    // actually research showed May 2025 for FULL exemption on new homes)
    
    // NEW HOMES (May 2025+)
    if (propertyType === 'new' && date >= may2025) {
      finalDuty = 0
      concessionApplied = true
    } 
    // EXISTING HOMES (or new homes before May 2025)
    else if (propertyType === 'existing') {
      // Thresholds increased June 2024: Full exemption to $700k, phases out to $800k
      if (price <= 700000) {
        finalDuty = 0
        concessionApplied = true
      } else if (price < 800000) {
        // Sliding scale: Concession = StandardDuty - ((Price - 700,000) / 100 * 24.525)
        // Actually simpler: The duty is just $24.525 for every $100 over $700,000
        finalDuty = Math.ceil((price - 700000) / 100) * 24.525
        concessionApplied = true
      }
    }
  }

  return {
    duty: Math.round(finalDuty),
    standardDuty: Math.round(standardDuty),
    concessionApplied,
    concessionAmount: Math.round(standardDuty - finalDuty)
  }
}

/**
 * Iteratively solves for the affordable house price.
 * Because Stamp Duty depends on Price, but Price = Budget - Stamp Duty.
 */
export function solveAffordablePrice(totalBudget: number, costs: CostsConfig, contractDate?: string) {
  let affordablePrice = totalBudget
  let lastPrice = 0
  
  // Usually converges in 3-4 iterations
  for (let i = 0; i < 10; i++) {
    const dutyResult = calculateQLDStampDuty(affordablePrice, costs.isFirstHomeBuyer, costs.propertyType, contractDate)
    const totalFees = costs.legalCosts + costs.buildingAndPest + costs.otherGovtCosts
    
    affordablePrice = totalBudget - dutyResult.duty - totalFees
    
    if (Math.abs(affordablePrice - lastPrice) < 1) break
    lastPrice = affordablePrice
  }

  const finalDuty = calculateQLDStampDuty(affordablePrice, costs.isFirstHomeBuyer, costs.propertyType, contractDate)
  
  return {
    affordablePrice: Math.max(0, Math.round(affordablePrice)),
    stampDuty: finalDuty.duty,
    concessionApplied: finalDuty.concessionApplied,
    concessionAmount: finalDuty.concessionAmount,
    totalCosts: Math.round(finalDuty.duty + (costs.legalCosts || 0) + (costs.buildingAndPest || 0) + (costs.otherGovtCosts || 0))
  }
}

export function useStampDutyCalculator() {
  return {
    calculateQLDStampDuty,
    solveAffordablePrice
  }
}
