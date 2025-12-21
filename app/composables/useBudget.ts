import type { BudgetItem, BudgetFrequency, OneOffExpense, OneOffDeposit, BudgetCategory } from '~/types'

export function useBudget() {
  /**
   * Normalizes any frequency to its fortnightly amount
   */
  function toFortnightlyAmount(item: BudgetItem, currentDate = new Date()): number {
    if (!isItemActiveOnDate(item, currentDate)) {
      return 0
    }

    if (item.category === 'goal' && item.deadline && !item.completedAt) {
      return calculateGoalFortnightly(item, currentDate)
    }

    const multipliers: Record<BudgetFrequency, number> = {
      weekly: 2,
      fortnightly: 1,
      monthly: 1 / 2.167, // 12 / 26
      quarterly: 1 / 6.5,   // 4 / 26
      biannually: 1 / 13,  // 2 / 26
      yearly: 1 / 26       // 1 / 26
    }
    return item.amount * (multipliers[item.frequency] || 1)
  }

  /**
   * Normalizes any frequency to its monthly amount (for deposit calculations)
   */
  function toMonthlyAmount(item: BudgetItem, currentDate = new Date()): number {
    if (!isItemActiveOnDate(item, currentDate)) {
      return 0
    }

    if (item.category === 'goal' && item.deadline && !item.completedAt) {
      // For goals with deadlines, we calculate the required fortnightly amount
      // then convert that to monthly to ensure consistency with pay cycles
      const fortnightly = calculateGoalFortnightly(item, currentDate)
      return fortnightly * 2.167
    }

    const multipliers: Record<BudgetFrequency, number> = {
      weekly: 4.333,      // 52 / 12
      fortnightly: 2.167, // 26 / 12
      monthly: 1,
      quarterly: 1 / 3,
      biannually: 1 / 6,
      yearly: 1 / 12
    }
    return item.amount * (multipliers[item.frequency] || 1)
  }

  /**
   * Check if a budget item is active on a specific date
   */
  function isItemActiveOnDate(item: BudgetItem, date: Date): boolean {
    // Check start date
    if (item.startDate) {
      const start = new Date(item.startDate)
      if (start > date) return false  // Not started yet
    }
    
    // Check end date
    if (item.endDate) {
      const end = new Date(item.endDate)
      if (end < date) return false  // Already ended
    }
    
    return true
  }

  /**
   * Calculate total monthly expenses for a specific date
   * Includes recurring items + goal savings + one-off expenses that occur in that month
   */
  function getMonthlyExpensesForDate(
    budgetItems: BudgetItem[],
    oneOffExpenses: OneOffExpense[],
    date: Date
  ): { recurring: number, oneOff: number, goalSavings: number, total: number, breakdown: Record<BudgetCategory, number> } {
    // Initialize breakdown with all known categories to satisfy TS and logic
    const breakdown: Record<BudgetCategory, number> = {
      essential: 0,
      recurring: 0,
      goal: 0
    }

    const today = new Date()

    // Calculate per category
    budgetItems
      .filter(i => !i.completedAt)
      .forEach(item => {
        // IMPORTANT: For goal savings in a simulation, we use a stable rate calculated from TODAY
        // rather than recalculating the rate as the simulation moves forward.
        // This prevents the "spiraling" effect where we try to catch up on the full goal in the last month.
        const calculationDate = item.category === 'goal' ? today : date
        const amount = toMonthlyAmount(item, calculationDate)
        
        // However, if the simulation date is past the goal deadline, we shouldn't be saving anymore
        if (item.category === 'goal' && item.deadline && new Date(item.deadline) < date) {
           return
        }

        if (item.category in breakdown) {
          breakdown[item.category] += amount
        }
      })

    // Recurring expenses (essentials + recurring category)
    const recurring = breakdown.essential + breakdown.recurring
    
    // Goal savings allocation
    const goalSavings = breakdown.goal
    
    // One-off expenses for this specific month
    const monthPrefix = date.toISOString().substring(0, 7) // "2025-04"
    const oneOff = oneOffExpenses
      .filter(e => e.date.startsWith(monthPrefix))
      .reduce((sum, e) => sum + e.amount, 0)
    
    // NOTE: We removed goalsHittingDeadline from expenses here.
    // Since goal savings are diverted monthly into a separate "bucket" (out of the house surplus),
    // the principal is already accounted for by the time the deadline hits.
    
    const total = recurring + oneOff + goalSavings
    
    return {
      recurring,
      oneOff,
      goalSavings,
      total,
      breakdown
    }
  }

  /**
   * Calculate total one-off deposits for a specific month
   */
  function getMonthlyDepositsForDate(
    oneOffDeposits: OneOffDeposit[],
    date: Date
  ): number {
    const monthPrefix = date.toISOString().substring(0, 7)
    return oneOffDeposits
      .filter(d => d.date.startsWith(monthPrefix))
      .reduce((sum, d) => sum + d.amount, 0)
  }

  /**
   * Calculates the required fortnightly amount to reach a goal by its deadline
   */
  function calculateGoalFortnightly(item: BudgetItem, currentDate: Date): number {
    if (!item.deadline) return 0

    const deadline = new Date(item.deadline)
    const diffTime = deadline.getTime() - currentDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // If deadline passed, no more savings needed
    if (diffDays <= 0) return 0
    
    // Minimum 1 fortnight to avoid division by zero
    const fortnightsRemaining = Math.max(1, Math.ceil(diffDays / 14))

    return item.amount / fortnightsRemaining
  }

  /**
   * Check if a goal is completed based on its deadline
   * We use a 2-day grace period to avoid premature triggers while typing dates
   */
  function isGoalComplete(item: BudgetItem, currentDate = new Date()): boolean {
    if (item.category !== 'goal' || !item.deadline) return false
    const deadline = new Date(item.deadline)
    const graceDate = new Date(currentDate)
    graceDate.setDate(graceDate.getDate() - 2)
    return deadline < graceDate
  }

  /**
   * Returns summary totals for the budget for current month
   */
  function getBudgetSummary(items: BudgetItem[], currentDate = new Date()) {
    // Only items that haven't been explicitly marked as completed and are active
    const activeItems = items.filter(i => !i.completedAt && isItemActiveOnDate(i, currentDate))
    
    const essential = activeItems
      .filter(i => i.category === 'essential')
      .reduce((sum, i) => sum + toFortnightlyAmount(i, currentDate), 0)

    const recurring = activeItems
      .filter(i => i.category === 'recurring')
      .reduce((sum, i) => sum + toFortnightlyAmount(i, currentDate), 0)

    const goals = activeItems
      .filter(i => i.category === 'goal')
      .reduce((sum, i) => sum + toFortnightlyAmount(i, currentDate), 0)

    const totalFortnightly = essential + recurring + goals
    
    // Total monthly
    const totalMonthly = activeItems
      .reduce((sum, i) => sum + toMonthlyAmount(i, currentDate), 0)

    return {
      essential,
      recurring,
      goals,
      totalFortnightly,
      totalMonthly
    }
  }

  /**
   * Handles recurring goal renewal
   */
  function checkAndRenewRecurringGoals(items: BudgetItem[]): BudgetItem[] {
    const today = new Date()
    let hasChanges = false
    const newItems = [...items]

    items.forEach((item, index) => {
      if (
        item.category === 'goal' &&
        item.goalType === 'recurring' &&
        item.deadline &&
        !item.completedAt &&
        new Date(item.deadline) < today
      ) {
        hasChanges = true
        // Mark current as completed
        newItems[index] = { ...item, completedAt: item.deadline }

        // Create next cycle (1 year later)
        const nextDeadline = new Date(item.deadline)
        nextDeadline.setFullYear(nextDeadline.getFullYear() + 1)

        newItems.push({
          ...item,
          id: crypto.randomUUID(),
          deadline: nextDeadline.toISOString().split('T')[0],
          completedAt: undefined
        })
      } else if (
        item.category === 'goal' &&
        item.goalType === 'once-off' &&
        item.deadline &&
        !item.completedAt &&
        new Date(item.deadline) < today
      ) {
        hasChanges = true
        // Just mark as completed
        newItems[index] = { ...item, completedAt: item.deadline }
      }
    })

    return hasChanges ? newItems : items
  }

  return {
    toFortnightlyAmount,
    toMonthlyAmount,
    getBudgetSummary,
    isGoalComplete,
    checkAndRenewRecurringGoals,
    isItemActiveOnDate,
    getMonthlyExpensesForDate,
    getMonthlyDepositsForDate
  }
}
