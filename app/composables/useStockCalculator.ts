import type { StockHolding, FhssContribution } from '~/types'

/**
 * Project the value of a single stock holding to the target date,
 * including its share of the monthly stock investment.
 */
export function projectStockHolding(
  holding: StockHolding, 
  yearsUntilTarget: number,
  price: number,
  growthRate: number,
  monthlyContribution: number = 0
) {
  // 1. Project initial holding value
  const currentValue = holding.shares * price
  const projectedInitialValue = currentValue * Math.pow(1 + growthRate, yearsUntilTarget)
  
  // 2. Project future value of monthly contributions
  // FV = P * [((1 + r)^n - 1) / r]
  let projectedContributionsValue = 0
  const months = Math.floor(yearsUntilTarget * 12)
  
  if (monthlyContribution > 0 && months > 0) {
    const monthlyRate = growthRate / 12
    if (monthlyRate > 0) {
      projectedContributionsValue = monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate
    } else {
      projectedContributionsValue = monthlyContribution * months
    }
  }

  const projectedValue = projectedInitialValue + projectedContributionsValue

  return { 
    currentValue: Math.round(currentValue), 
    projectedValue: Math.round(projectedValue), 
    growthRate,
    price,
    initialProjected: Math.round(projectedInitialValue),
    contributionsProjected: Math.round(projectedContributionsValue)
  }
}

/**
 * Calculate FHSS releasable amount including deemed earnings
 */
export function calculateFhssResult(
  contributions: FhssContribution[],
  targetDateStr: string,
  sicRate: number
) {
  const targetDate = new Date(targetDateStr)
  let totalPrincipal = 0
  let totalEarnings = 0

  contributions.forEach(contribution => {
    const contributionDate = new Date(contribution.date)
    const days = Math.max(0, (targetDate.getTime() - contributionDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const releasablePrincipal = contribution.type === 'concessional' 
      ? contribution.amount * 0.85 
      : contribution.amount
    
    // Daily compounding: FV = P * (1 + r/365)^days
    // Earnings = FV - P
    const dailyRate = sicRate / 365
    const projectedValue = releasablePrincipal * Math.pow(1 + dailyRate, days)
    const earnings = projectedValue - releasablePrincipal

    totalPrincipal += releasablePrincipal
    totalEarnings += earnings
  })

  return {
    totalPrincipal: Math.round(totalPrincipal),
    totalEarnings: Math.round(totalEarnings),
    totalReleasable: Math.round(totalPrincipal + totalEarnings)
  }
}

export function useStockCalculator() {
  return {
    projectStockHolding,
    calculateFhssResult
  }
}
