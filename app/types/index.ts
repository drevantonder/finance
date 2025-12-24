export type IncomeType = 'tmn' | 'salary' | 'centrelink'

export interface TmnIncomeConfig {
  currentAmount: number           // Current TMN (starting point for growth)
  targetAmount: number            // Target TMN (goal)
  partnerCommitments: number     // Actual committed amount from partners
  increaseIntervalMonths: number  // Grow every N months
  mmr: number                     // Ministry expense budget (default 530)
  giving: number                  // Monthly giving (default 505)
  postTaxSuper: number            // Post-tax super (default 84)
}

export interface IncomeBreakdownItem {
  sourceId: string
  sourceName: string
  type: IncomeType
  netIncome: number
}

export interface ProjectionSeriesPoint {
  monthOffset: number
  date: string
  tmnTarget: number           // The stepped growth plan value
  partnerCommitments: number   // Total actual commitments
  netIncome: number
  incomeBreakdown: IncomeBreakdownItem[]
  expenses: number
  deposits: number
  surplus: number
  cashBalance: number
  emergencyFund: number      // Portion of cash reserved for emergency
  availableCash: number      // Cash available above emergency target
  stocksValue: number
  fhssValue: number           // Breakdown FHSS
  investedThisMonth: number
  stockGrowthThisMonth: number
  totalDeposit: number
  isHistorical: boolean
  emergencyStatus: 'critical' | 'rebuilding' | 'healthy'
  expenseBreakdown: Record<BudgetCategory, number>
  goalSavingsAllocated: number   // How much saved for goals this month
  oneOffExpensesPaid: number     // One-off expenses that occurred this month
  oneOffDepositsReceived: number // One-off deposits received this month
  personHecsBalances: Record<string, number> // Track HECS balance per person over time
  totalHecsBalance: number      // NEW: Total household HECS balance
  totalHecsRepayment: number    // NEW: Total household HECS repayment this month
  totalHecsAddition?: number    // NEW: Total HECS additions this month
  isPartialMonth?: boolean      // NEW: Partial month tracking
  prorationFactor?: number      // 0-1, fraction of month included
  investmentsBySymbol?: Record<string, number>  // Investment breakdown by stock symbol
  brokerFeesPaid?: number                        // Total broker fees paid this month
  skippedInvestment?: boolean                    // True if surplus below minimum threshold
  pendingInvestmentCash?: number                 // Cash accumulating toward minimum
}

export interface SmartProjectionResult {
  finalDeposit: number
  totalSaved: number
  series: ProjectionSeriesPoint[]
}

export interface SalaryIncomeConfig {
  grossAnnual: number             // Annual gross salary
}

export interface CentrelinkIncomeConfig {
  fortnightlyAmount: number       // Payment amount per fortnight
  paymentType: string             // e.g., "Youth Allowance", "JobSeeker"
  taxable: boolean                // NEW: Does this payment count towards HECS/Income Tax?
  paymentAnchorDate?: string      // NEW: A known payment date to calculate cycle from
}

// NEW: HECS Debt attached to a person
export interface HecsAddition {
  id: string
  date: string           // Census date ISO (e.g., "2026-03-31")
  amount: number         // Debt amount (e.g., 5000)
  description?: string   // Optional label (e.g., "Sem 1 - OT Placement")
}

export interface HecsDebt {
  balance: number           // Current known balance
  balanceAsOfDate: string   // ISO date when user checked balance
  indexationRate: number    // Annual indexation rate (default 0.04)
  scheduledAdditions?: HecsAddition[] // NEW: Future additions to debt
}

// NEW: Person in household
export interface Person {
  id: string                // UUID
  name: string              // "Dan", "Sarah"
  hecsDebt?: HecsDebt       // Optional
}

export interface IncomeSource {
  id: string                      // UUID
  personId: string                // NEW: Link to Person
  name: string                    // Custom name, e.g., "Dan's TMN"
  type: IncomeType
  startDate: string | null        // null = already active
  endDate: string | null          // null = indefinite
  paymentDayOfMonth?: number      // NEW: 1-31, for monthly income (TMN/Salary)
  tmn?: TmnIncomeConfig
  salary?: SalaryIncomeConfig
  centrelink?: CentrelinkIncomeConfig
}

export interface StockHolding {
  symbol: string           // e.g., "IVV", "NDQ", "VGS", "VHY"
  shares: number           // Number of shares held
  sharesAsOfDate?: string  // NEW: When shares count was last verified
}

export interface StockAllocation {
  symbol: string           // e.g., "IVV.AX"
  weight: number           // 0-1 (e.g., 0.7 = 70%) - must sum to 1.0 across all allocations
}

export interface InvestmentStrategy {
  allocations: StockAllocation[]     // Target allocation for new investments
  brokerFee: number                  // Per-transaction fee (default $2 for SuperHero)
  minimumInvestment: number          // Don't invest below this threshold
  reviewCadence: 'weekly' | 'fortnightly' | 'monthly'  // Informational - user's intended review frequency
}


export type FhssContributionType = 'concessional' | 'non-concessional'

export interface FhssContribution {
  id: string
  date: string // ISO date YYYY-MM-DD
  amount: number
  type: FhssContributionType
}

export interface OneOffExpense {
  id: string
  name: string
  amount: number
  date: string // ISO date YYYY-MM-DD
}

export interface OneOffDeposit {
  id: string
  name: string
  amount: number
  date: string // ISO date YYYY-MM-DD
}

export type BudgetFrequency = 
  | 'weekly' 
  | 'fortnightly' 
  | 'monthly' 
  | 'quarterly' 
  | 'biannually'
  | 'yearly'

export type BudgetCategory = 
  | 'essential'
  | 'recurring'
  | 'goal'

export type GoalType = 'once-off' | 'recurring'

export interface BudgetItem {
  id: string
  name: string
  amount: number                   // Amount per occurrence (in the specified frequency)
  frequency: BudgetFrequency
  category: BudgetCategory
  startDate?: string               // ISO date - when expense begins
  endDate?: string                 // ISO date - when expense ends
  goalType?: GoalType              // Only for category: 'goal'
  deadline?: string                // ISO date (YYYY-MM-DD) - for goals
  completedAt?: string             // ISO date when goal was completed
  notes?: string
}

export interface BudgetConfig {
  budgetItems: BudgetItem[]
  oneOffExpenses: OneOffExpense[]
  oneOffDeposits: OneOffDeposit[]
  emergencyFloor: number
  emergencyTarget: number
}

// Deposit configuration with growth projections
export interface DepositConfig {
  cashSavings: number // Current cash savings
  cashSavingsAsOfDate?: string // NEW: When cash was last verified
  fhssContributions: FhssContribution[] // List of FHSS contributions
  fhssSicRate: number // Deemed interest rate (SIC) e.g., 0.0717
  holdings: StockHolding[] // Individual stock/ETF holdings
  defaultGrowthRate: number // Fallback growth rate for stocks without custom rate
  targetDate: string // ISO date string (e.g., "2027-03-01")
  journeyStartDate?: string // NEW: When to start projecting (defaults to today)
  investmentStrategy?: InvestmentStrategy // NEW: Strategy for new stock investments
  
  // Legacy / Deprecated
  monthlySavings?: number 
  monthlyStockInvestment?: number
  livingExpenses?: number
  targetCashMargin?: number
  budgetItems?: BudgetItem[]
  oneOffExpenses?: OneOffExpense[]
  oneOffDeposits?: OneOffDeposit[]
}

// Loan configuration parameters
export interface LoanConfig {
  deposit: number // Auto-calculated from DepositConfig
  interestRate: number // Actual rate (default 6.0%)
  baseExpenses: number // Monthly living expenses (HEM) - default 3800
  loanTerm: number // Years (default 30)
  dtiCap: number // Debt-to-income multiplier (default 5.0x)
}

export type PropertyType = 'existing' | 'new' | 'land'
export type AustralianState = 'QLD'

export interface CostsConfig {
  isFirstHomeBuyer: boolean      // Enables FHB concessions
  state: AustralianState
  propertyType: PropertyType
  legalCosts: number             // Default: 2000
  buildingAndPest: number        // Default: 1000  
  otherGovtCosts: number         // Default: 1500 (registration, searches)
}

// Complete configuration for a calculation session
export interface SessionConfig {
  people: Person[]                // NEW
  incomeSources: IncomeSource[]
  budget: BudgetConfig
  deposit: DepositConfig
  loan: LoanConfig
  costs: CostsConfig
}

// Results from scenario-based calculation
export type LimitingFactor = 'DTI' | 'Serviceability'

export interface ScenarioResult {
  borrowingCapacity: number // FINAL capacity (Min of DTI & Serviceability)
  dtiCapacity: number // The raw DTI limit
  serviceabilityCapacity: number // The raw Serviceability limit
  maxPurchasePrice: number // Capacity + deposit
  monthlyRepayment: number // Actual repayment
  stressRepayment: number // Repayment at stress rate
  stressRate: number // The rate used for serviceability (Rate + 3%)
  limitingFactor: LimitingFactor // which gate limited the loan
  assessedIncome: number // Monthly household income as assessed by bank
  dtiRatio: number // Actual DTI ratio achieved
  hecsMonthlyImpact: number // Monthly HECS repayment deduction
  
  costs: {
    stampDuty: number
    concessionApplied: boolean
    concessionAmount: number
    totalCosts: number
    affordablePrice: number
  }

  // Debug/Transparency values
  grossAnnualIncome: number
  monthlySurplus: number
  
  // Granular Breakdown
  breakdown: {
    applicantNet: number
    spouseNet: number
    mfbAssessed: number
    mfbRaw: number
    applicantHecs: number
    spouseHecs: number
    taxMonthly: number
    
    // DTI Specifics
    grossTaxableAnnual: number
    grossMfbAnnual: number
    spouseGrossAnnual: number
    existingDebt: number
    
    // NEW: Person-level details for transparency
    people: Array<{
      name: string
      projectedHecs: number
      currentHecs: number
      repaymentsDuringJourney: number
      indexationDuringJourney: number
    }>
  }
}

export type ExpenseStatus = 'pending' | 'processing' | 'complete' | 'error'

export interface ExpenseItem {
  name: string
  qty: number
  unit: string     // "ea", "kg", "L", etc.
  unitPrice: number
  lineTotal: number
  category?: string
  taxable?: boolean
}

export interface Expense {
  id: string
  imageKey: string
  imageHash: string | null
  receiptHash: string | null
  schemaVersion: number
  status: ExpenseStatus
  capturedAt: string | Date
  total: number | null
  tax: number | null
  merchant: string | null
  date: string | null // ISO date
  items: string | null // JSON string of ExpenseItem[]
  rawExtraction: string | null // JSON string
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Category {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: Date
  updatedAt: Date
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error'

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  details: string | null
  source: string
  ip: string | null
  createdAt: Date
}
