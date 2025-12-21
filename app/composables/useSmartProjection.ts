import type { 
  IncomeSource, 
  DepositConfig, 
  BudgetConfig, 
  SmartProjectionResult, 
  ProjectionSeriesPoint,
  IncomeBreakdownItem,
  Person
} from '~/types'
import { useBudget } from '~/composables/useBudget'
import { calculateSourceNetMonthly } from '~/composables/useLoanCalculator'
import { calculateFhssResult } from '~/composables/useStockCalculator'
import { getIncomeYear, calculateHecsRepayment } from '~/composables/useTaxCalculator'
import { isIncomeActiveOnDate, countFortnightsInRange, getActiveIncomeSources } from '~/composables/useDateUtils'
import { 
  projectHecsBalance,
  calculatePersonRepaymentIncome,
  calculatePersonMonthlyHecsRepayment
} from '~/composables/useHecsCalculator'
import { 
  getTmnValueAtMonth
} from '~/composables/useTmnCalculator'
export interface StockDataMap {
  [symbol: string]: {
    price: number | null
    growthRate?: number
    recommendedRate?: number
    dividendYield?: number
    totalReturnRate?: number
  }
}

/**
 * Calculates the fraction of the month that applies for first/last month
 */
function getMonthProrationFactor(
  loopDate: Date,
  isFirstMonth: boolean,
  isLastMonth: boolean,
  journeyStartDay: number,
  targetDay: number
): number {
  const daysInMonth = new Date(loopDate.getFullYear(), loopDate.getMonth() + 1, 0).getDate()
  
  if (isFirstMonth) {
    const daysRemaining = daysInMonth - journeyStartDay + 1
    return Math.max(0, Math.min(1, daysRemaining / daysInMonth))
  }
  
  if (isLastMonth) {
    return Math.max(0, Math.min(1, targetDay / daysInMonth))
  }
  
  return 1.0
}

/**
 * Checks if a monthly income is received in the current loop month based on payment day
 */
function isIncomeReceivedInMonth(
  source: IncomeSource,
  loopDate: Date,
  isFirstMonth: boolean,
  isLastMonth: boolean,
  journeyStartDay: number,
  targetDay: number
): boolean {
  const paymentDay = source.paymentDayOfMonth ?? 28
  
  if (isFirstMonth) {
    // If we start BEFORE payment day, we are yet to be paid.
    return journeyStartDay <= paymentDay
  }
  
  if (isLastMonth) {
    // Only include if target date is on or after payment day
    return targetDay >= paymentDay
  }
  
  return true
}

/**
 * Advanced monthly projection for deposit accumulation

 */
export function calculateSmartProjection(
  people: Person[],
  incomeSources: IncomeSource[],
  config: DepositConfig,
  budget: BudgetConfig,
  stockDataMap: StockDataMap = {},
  startDate?: string
): SmartProjectionResult {
  const { getMonthlyExpensesForDate, getMonthlyDepositsForDate } = useBudget()
  
  // 1. Determine Journey Start
  const today = new Date()
  let journeyStart: Date
  if (config.journeyStartDate) {
    journeyStart = new Date(config.journeyStartDate)
  } else if (startDate) {
    journeyStart = new Date(startDate)
  } else {
    journeyStart = new Date() // Exact now
  }
  
  const journeyStartDay = journeyStart.getDate()
  const journeyStartMonthFirst = new Date(journeyStart.getFullYear(), journeyStart.getMonth(), 1)
  
  const targetDate = new Date(config.targetDate)
  const targetDay = targetDate.getDate()
  
  const monthsUntilTarget = Math.max(0, 
    (targetDate.getFullYear() - journeyStartMonthFirst.getFullYear()) * 12 + 
    (targetDate.getMonth() - journeyStartMonthFirst.getMonth())
  )

  const series: ProjectionSeriesPoint[] = []
  let cashPool = config.cashSavings
  
  // Initialize HECS balances
  let currentHecsBalances: Record<string, number> = {}
  for (const person of people) {
    if (person.hecsDebt) {
      currentHecsBalances[person.id] = person.hecsDebt.balance
    }
  }

  let holdingPools = config.holdings.map(h => {
    const data = stockDataMap[h.symbol.toUpperCase()]
    const price = data?.price || 0
    const growth = data?.totalReturnRate || data?.recommendedRate || data?.growthRate || config.defaultGrowthRate / 100 || 0.07
    return {
      symbol: h.symbol,
      value: h.shares * price,
      growthRate: growth
    }
  })
  
  const investmentPools: Record<string, { value: number, growthRate: number }> = {}
  const strategy = config.investmentStrategy
  const defaultMonthlyGrowth = (config.defaultGrowthRate / 100) / 12

  let totalSaved = 0
  let loopMonthsCount = monthsUntilTarget
  
  // If target is the 1st of the month, we don't include that month's activity
  // because the journey ends before anything happens in that month.
  if (targetDay === 1 && monthsUntilTarget > 0) {
    loopMonthsCount = monthsUntilTarget - 1
  }

  for (let month = 0; month <= loopMonthsCount; month++) {
    const totalMonths = journeyStartMonthFirst.getMonth() + month
    const loopYear = journeyStartMonthFirst.getFullYear() + Math.floor(totalMonths / 12)
    const loopMonth = totalMonths % 12
    
    const dateStr = `${loopYear}-${String(loopMonth + 1).padStart(2, '0')}-01`
    const currentLoopDate = new Date(dateStr)
    const incomeYear = getIncomeYear(currentLoopDate)
    
    const isFirstMonth = month === 0
    const isLastMonth = month === monthsUntilTarget
    
    const prorationFactor = getMonthProrationFactor(currentLoopDate, isFirstMonth, isLastMonth, journeyStartDay, targetDay)

    const monthStart = new Date(loopYear, loopMonth, 1)
    const monthEnd = new Date(loopYear, loopMonth + 1, 0, 23, 59, 59)

    // Compare months for isHistorical check
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()
    const isHistorical = (loopYear < todayYear) || (loopYear === todayYear && loopMonth < todayMonth)
    
    // 0. Update HECS (Additions, Indexation)
    let totalHecsAdditionThisMonth = 0
    for (const person of people) {
      if (!person.hecsDebt) continue

      // A. Scheduled Additions
      if (person.hecsDebt.scheduledAdditions) {
        const balanceAsOfDate = new Date(person.hecsDebt.balanceAsOfDate)
        const additionsThisMonth = person.hecsDebt.scheduledAdditions
          .filter(a => {
            const d = new Date(a.date)
            return d >= monthStart && d <= monthEnd && d > balanceAsOfDate
          })
          .reduce((sum, a) => sum + Number(a.amount), 0)
        
        if (additionsThisMonth > 0) {
          currentHecsBalances[person.id] = (currentHecsBalances[person.id] || 0) + additionsThisMonth
          totalHecsAdditionThisMonth += additionsThisMonth
        }
      }

      // B. Annual Indexation (June 1st)
      if (loopMonth === 5) { // June
        const currentBalance = currentHecsBalances[person.id]
        if (currentBalance !== undefined && currentBalance > 0) {
          currentHecsBalances[person.id] = currentBalance * (1 + person.hecsDebt.indexationRate)
        }
      }
    }

    // 1. Calculate Household Net Income for this month
    const activeIncomes = getActiveIncomeSources(incomeSources, currentLoopDate)
    let netIncome = 0
    let totalTmnTarget = 0
    let totalPartnerCommitments = 0
    const incomeBreakdown: IncomeBreakdownItem[] = []
    
    // Calculate Person-level HECS for this month
    const personHecsDeductions: Record<string, number> = {}
    let totalHecsRepaymentThisMonth = 0
    for (const person of people) {
      const currentBalance = currentHecsBalances[person.id]
      if (person.hecsDebt && currentBalance !== undefined && currentBalance > 0) {
        const { repayment, newBalance } = calculatePersonMonthlyHecsRepayment(
          person.id,
          activeIncomes,
          currentLoopDate,
          currentBalance
        )
        const adjustedRepayment = repayment * prorationFactor
        personHecsDeductions[person.id] = adjustedRepayment
        currentHecsBalances[person.id] = Math.max(0, currentBalance - adjustedRepayment)
        totalHecsRepaymentThisMonth += adjustedRepayment
      } else {
        personHecsDeductions[person.id] = 0
      }
    }

    for (const source of activeIncomes) {
      let sourceNet = 0
      
      // Calculate TMN Target/Commitments regardless of whether payment is received this month
      // This ensures charts show the target capacity even in partial months
      if (source.type === 'tmn' && source.tmn) {
        const { currentAmount, targetAmount, partnerCommitments, increaseIntervalMonths } = source.tmn
        const currentTmnValue = getTmnValueAtMonth(currentAmount, targetAmount, increaseIntervalMonths, monthsUntilTarget, month)
        
        totalTmnTarget += currentTmnValue
        totalPartnerCommitments += partnerCommitments
        
        const isReceived = isIncomeReceivedInMonth(source, currentLoopDate, isFirstMonth, isLastMonth, journeyStartDay, targetDay)
        if (isReceived) {
          sourceNet = calculateSourceNetMonthly(source, currentTmnValue, currentLoopDate, undefined)
        }
      } else if (source.type === 'centrelink' && source.centrelink && source.centrelink.paymentAnchorDate) {
        const anchor = new Date(source.centrelink.paymentAnchorDate)
        const monthStart = isFirstMonth ? journeyStart : new Date(loopYear, loopMonth, 1)
        const monthEnd = isLastMonth ? targetDate : new Date(loopYear, loopMonth + 1, 0, 23, 59, 59)
        
        const { count, partialFraction } = countFortnightsInRange(anchor, monthStart, monthEnd)
        const effectivePayments = count + partialFraction
        sourceNet = source.centrelink.fortnightlyAmount * effectivePayments
      } else {
        const isReceived = isIncomeReceivedInMonth(source, currentLoopDate, isFirstMonth, isLastMonth, journeyStartDay, targetDay)
        if (isReceived) {
          sourceNet = calculateSourceNetMonthly(source, undefined, currentLoopDate, undefined)
        }
      }
      
      netIncome += sourceNet
      incomeBreakdown.push({
        sourceId: source.id,
        sourceName: source.name,
        type: source.type,
        netIncome: Math.round(sourceNet)
      })
    }
    
    // 2. Calculate Expenses & Deposits
    const rawExpenseBreakdown = getMonthlyExpensesForDate(
      budget.budgetItems,
      budget.oneOffExpenses,
      currentLoopDate
    )
    
    const expenseBreakdown = {
      ...rawExpenseBreakdown,
      breakdown: {
        essential: (rawExpenseBreakdown.breakdown.essential || 0) * prorationFactor,
        recurring: (rawExpenseBreakdown.breakdown.recurring || 0) * prorationFactor,
        goal: (rawExpenseBreakdown.breakdown.goal || 0) * prorationFactor,
      },
      total: (rawExpenseBreakdown.total - rawExpenseBreakdown.oneOff) * prorationFactor + rawExpenseBreakdown.oneOff,
      goalSavings: rawExpenseBreakdown.goalSavings * prorationFactor
    }
    
    const monthlyDeposits = getMonthlyDepositsForDate(
      budget.oneOffDeposits,
      currentLoopDate
    )
    
    const totalExpenses = expenseBreakdown.total + totalHecsRepaymentThisMonth
    const surplus = netIncome - totalExpenses + monthlyDeposits
    totalSaved += surplus

    cashPool += surplus
    
    // 3. Emergency-aware investment logic with strategy
    let investedThisMonth = 0
    let brokerFeesPaid = 0
    let skippedInvestment = false
    let pendingCash = 0
    const investmentsBySymbol: Record<string, number> = {}
    let emergencyStatus: 'critical' | 'rebuilding' | 'healthy' = 'healthy'
    
    if (cashPool < budget.emergencyFloor) {
      emergencyStatus = 'critical'
    } else if (cashPool < budget.emergencyTarget) {
      emergencyStatus = 'rebuilding'
    } else {
      emergencyStatus = 'healthy'
      const availableToInvest = cashPool - budget.emergencyTarget
      const minInvestment = strategy?.minimumInvestment ?? 500
      const brokerFee = strategy?.brokerFee ?? 2
      const allocations = strategy?.allocations ?? [{ symbol: 'IVV.AU', weight: 1.0 }]
      
      if (availableToInvest >= minInvestment) {
        for (const alloc of allocations) {
          const grossAmount = availableToInvest * alloc.weight
          const netAmount = grossAmount - brokerFee
          
          if (netAmount > 0) {
            const symbol = alloc.symbol.toUpperCase()
            investmentsBySymbol[symbol] = netAmount
            
            if (!investmentPools[symbol]) {
              const data = stockDataMap[symbol]
              const growth = data?.totalReturnRate || data?.recommendedRate || config.defaultGrowthRate / 100 || 0.07
              investmentPools[symbol] = { value: 0, growthRate: growth }
            }
            
            investmentPools[symbol].value += netAmount
            brokerFeesPaid += brokerFee
            investedThisMonth += netAmount
          }
        }
        
        cashPool = budget.emergencyTarget
      } else if (availableToInvest > 0) {
        skippedInvestment = true
        pendingCash = availableToInvest
      }
    }
    
    // 4. Apply Stock Growth (Prorated)
    let stockGrowthThisMonth = 0
    holdingPools = holdingPools.map(h => {
      const growth = h.value * (h.growthRate / 12) * prorationFactor
      stockGrowthThisMonth += growth
      return { ...h, value: h.value + growth }
    })
    
    for (const symbol in investmentPools) {
      const pool = investmentPools[symbol]
      if (!pool) continue
      const growth = pool.value * (pool.growthRate / 12) * prorationFactor
      stockGrowthThisMonth += growth
      pool.value += growth
    }
    
    // 5. Calculate FHSS
    const currentFhss = calculateFhssResult(config.fhssContributions, dateStr, config.fhssSicRate).totalReleasable
    
    // 6. Record Point
    const totalStockValue = holdingPools.reduce((sum, h) => sum + h.value, 0) + 
                            Object.values(investmentPools).reduce((sum, p) => sum + p.value, 0)
    const emergencyFund = Math.min(cashPool, budget.emergencyTarget)
    const availableCash = Math.max(0, cashPool - budget.emergencyTarget)
    const totalDeposit = Math.round(availableCash + totalStockValue + currentFhss)

    const totalHecsBalance = Object.values(currentHecsBalances).reduce((sum, b) => sum + b, 0)

    series.push({
      monthOffset: month,
      date: dateStr,
      tmnTarget: Math.round(totalTmnTarget),
      partnerCommitments: Math.round(totalPartnerCommitments),
      netIncome: Math.round(netIncome),
      incomeBreakdown,
      expenses: Math.round(totalExpenses),
      expenseBreakdown: {
        essential: Math.round(expenseBreakdown.breakdown.essential || 0),
        recurring: Math.round(expenseBreakdown.breakdown.recurring || 0),
        goal: Math.round(expenseBreakdown.breakdown.goal || 0)
      },
      deposits: Math.round(monthlyDeposits),
      surplus: Math.round(surplus),
      cashBalance: Math.round(cashPool),
      emergencyFund: Math.round(emergencyFund),
      availableCash: Math.round(availableCash),
      stocksValue: Math.round(totalStockValue),
      fhssValue: Math.round(currentFhss),
      investedThisMonth: Math.round(investedThisMonth),
      stockGrowthThisMonth: Math.round(stockGrowthThisMonth),
      totalDeposit,
      isHistorical,
      emergencyStatus,
      goalSavingsAllocated: Math.round(expenseBreakdown.goalSavings),
      oneOffExpensesPaid: Math.round(expenseBreakdown.oneOff),
      oneOffDepositsReceived: Math.round(monthlyDeposits),
      personHecsBalances: { ...currentHecsBalances },
      totalHecsBalance: Math.round(totalHecsBalance),
      totalHecsRepayment: Math.round(totalHecsRepaymentThisMonth),
      totalHecsAddition: Math.round(totalHecsAdditionThisMonth),
      isPartialMonth: prorationFactor < 1,
      prorationFactor,
      investmentsBySymbol: Object.keys(investmentsBySymbol).length > 0 ? 
        Object.fromEntries(Object.entries(investmentsBySymbol).map(([k, v]) => [k, Math.round(v)])) : 
        undefined,
      brokerFeesPaid: brokerFeesPaid > 0 ? Math.round(brokerFeesPaid) : undefined,
      skippedInvestment: skippedInvestment || undefined,
      pendingInvestmentCash: pendingCash > 0 ? Math.round(pendingCash) : undefined
    })
  }
  
  const finalPoint = series[series.length - 1]
  
  return {
    finalDeposit: finalPoint ? finalPoint.totalDeposit : 0,
    totalSaved: Math.round(totalSaved),
    series
  }
}

export function useSmartProjection() {
  return {
    calculateSmartProjection
  }
}
