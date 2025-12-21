import { defineStore } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import type { 
  SessionConfig, 
  IncomeSource, 
  IncomeType, 
  BudgetConfig, 
  DepositConfig,
  BudgetItem,
  Person
} from '../types'
import { calculateSmartProjection } from '~/composables/useSmartProjection'
import { useStockPrices } from '~/composables/useStockPrices'

import { useAuthToken } from '~/composables/useAuthToken'
import { useSyncEngine } from '~/composables/useSyncEngine'

const STORAGE_KEY = 'house-progress-config-v5'
const MIGRATION_KEY = 'hp_migrated_v5'

export const useSessionStore = defineStore('session', () => {
  const stockPrices = useStockPrices()
  const { token, isAuthenticated, initializeFromUrl } = useAuthToken()
  
  const config = ref<SessionConfig>({
    people: [],
    incomeSources: [],
    budget: {
      budgetItems: [],
      oneOffExpenses: [],
      oneOffDeposits: [],
      emergencyFloor: 2000,
      emergencyTarget: 4000,
    },
    deposit: {
      cashSavings: 0,
      cashSavingsAsOfDate: new Date().toISOString().split('T')[0],
      fhssContributions: [],
      fhssSicRate: 0.0717,
      holdings: [],
      defaultGrowthRate: 6,
      targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0] || '',
      journeyStartDate: new Date().toISOString().split('T')[0],
      investmentStrategy: {
        allocations: [{ symbol: 'IVV.AU', weight: 1.0 }],
        brokerFee: 2,
        minimumInvestment: 500,
        reviewCadence: 'fortnightly'
      }
    },
    loan: {
      deposit: 0,
      interestRate: 0.0549,
      baseExpenses: 0,
      loanTerm: 30,
      dtiCap: 6.0,
    },

    costs: {
      isFirstHomeBuyer: true,
      state: 'QLD',
      propertyType: 'existing',
      legalCosts: 0,
      buildingAndPest: 0,
      otherGovtCosts: 0,
    },
  })

  const sync = useSyncEngine(config)

  // 2. Persistence Logic (Replaced by Sync Engine)
  function save() {
    // Sync engine handles this via watchDebounced internally
  }

  function addPerson(name: string = 'New Person'): Person {
    const person: Person = {
      id: crypto.randomUUID(),
      name
    }
    config.value.people.push(person)
    return person
  }

  function removePerson(id: string): void {
    if (config.value.people.length <= 1) return // Keep at least one
    
    // Remove person
    const idx = config.value.people.findIndex(p => p.id === id)
    if (idx !== -1) config.value.people.splice(idx, 1)

    // Remove their income sources
    config.value.incomeSources = config.value.incomeSources.filter(s => s.personId !== id)
  }

  function addIncomeSource(type: IncomeType, personId?: string): IncomeSource {
    const targetPersonId: string = personId || config.value.people[0]?.id || ''
    const count = config.value.incomeSources.filter(s => s.type === type).length + 1
    const names = { tmn: 'TMN', salary: 'Salary', centrelink: 'Centrelink' }
    
    const base: IncomeSource = {
      id: crypto.randomUUID(),
      personId: targetPersonId,
      name: `${names[type]} #${count}`,
      type,
      startDate: null,
      endDate: null,
      paymentDayOfMonth: type === 'tmn' ? 5 : (type === 'salary' ? 15 : 28)
    }
    
    if (type === 'tmn') {
      base.tmn = {
        currentAmount: 0,
        targetAmount: 0,
        partnerCommitments: 0,
        increaseIntervalMonths: 6,
        mmr: 0,
        giving: 0,
        postTaxSuper: 0,
      }
    } else if (type === 'salary') {
      base.salary = {
        grossAnnual: 0,
      }
    } else if (type === 'centrelink') {
      base.centrelink = {
        fortnightlyAmount: 0,
        paymentType: 'Youth Allowance',
        taxable: false,
      }
    }
    
    config.value.incomeSources.push(base)
    return base
  }

  function removeIncomeSource(id: string): void {
    const idx = config.value.incomeSources.findIndex(s => s.id === id)
    if (idx !== -1) config.value.incomeSources.splice(idx, 1)
  }

  function migrateFromV4(old: any): SessionConfig {
    const people: Person[] = []
    const personMap = new Map<string, string>() // Name -> ID

    const getOrAddPerson = (name: string): string => {
      const firstPart = (name || 'Applicant').split(' ')[0] || 'Applicant'
      const normalized = firstPart.replace("'s", "").replace("'","")
      if (personMap.has(normalized)) {
        return personMap.get(normalized)!
      }
      const id = crypto.randomUUID()
      people.push({ id, name: normalized })
      personMap.set(normalized, id)
      return id
    }

    // Pass 1: Identify people and HECS
    const incomeSources: IncomeSource[] = (old.incomeSources || []).map((s: any) => {
      const personId = getOrAddPerson(s.name)
      const hecsBalance = s.tmn?.hecsBalance || s.salary?.hecsBalance || 0
      const hasHecsDebt = s.tmn?.hasHecsDebt || s.salary?.hasHecsDebt || false

      if (hasHecsDebt && hecsBalance > 0) {
        const person = people.find(p => p.id === personId)!
        if (!person.hecsDebt) {
          person.hecsDebt = {
            balance: hecsBalance,
            balanceAsOfDate: new Date().toISOString().split('T')[0] as string,
            indexationRate: 0.04
          }
        }
      }

      // Clean the income source
      const cleaned: IncomeSource = {
        ...s,
        personId,
      }
      if (cleaned.tmn) {
        delete (cleaned.tmn as any).hasHecsDebt
        delete (cleaned.tmn as any).hecsBalance
      }
      if (cleaned.salary) {
        delete (cleaned.salary as any).hasHecsDebt
        delete (cleaned.salary as any).hecsBalance
      }
      if (cleaned.centrelink) {
        cleaned.centrelink.taxable = cleaned.centrelink.paymentType === 'JobSeeker' || cleaned.centrelink.paymentType === 'Youth Allowance'
      }

      return cleaned
    })

    // Fallback if no people were created
    if (people.length === 0) {
      people.push({ id: crypto.randomUUID(), name: 'Applicant 1' })
    }

    return {
      ...old,
      people,
      incomeSources
    }
  }

  function migrateFromV2(old: any): SessionConfig {
    // cascade V2 -> V3/V4 -> V5
    const v4 = {
      ...old,
      budget: {
        budgetItems: old.deposit?.budgetItems || [],
        oneOffExpenses: old.deposit?.oneOffExpenses || [],
        oneOffDeposits: old.deposit?.oneOffDeposits || [],
        emergencyFloor: 2000,
        emergencyTarget: 4000,
      }
    }
    return migrateFromV4(v4)
  }

  async function initialise() {
    // 1. Check for token in URL
    initializeFromUrl()

    if (!isAuthenticated.value) return

    try {
      // 2. Check if we need to migrate from localStorage
      const isMigrated = localStorage.getItem(MIGRATION_KEY)
      const rawV5 = localStorage.getItem(STORAGE_KEY)
      
      if (!isMigrated && rawV5) {
        console.log('Migrating localStorage to DB...')
        const localData = JSON.parse(rawV5)
        const success = await sync.migrate(localData)
        if (success) {
          localStorage.setItem(MIGRATION_KEY, 'true')
          // Optional: we keep STORAGE_KEY for a while as a safety backup
          return
        }
      }

      // 3. Try to load from sync engine (cache first, then pull)
      const cached = await sync.loadFromCache()
      if (cached) {
        config.value = cached.config
      }
      
      // Background pull to refresh
      await sync.pull()

      // Self-healing... (rest of the logic)
      if (!config.value.people || config.value.people.length === 0) {
        config.value.people = [{ id: crypto.randomUUID(), name: 'Applicant 1' }]
      }
      
      const people = config.value.people;
      config.value.incomeSources.forEach(s => {
        if (!s.personId || !people.some(p => p.id === s.personId)) {
          // Try to match by name prefix
          const firstPart = (s.name || '').split(' ')[0] || ''
          const normalizedName = firstPart.replace("'s", "").replace("'","")
          let match = people.find(p => p.name === normalizedName)
          
          if (!match && normalizedName !== 'Applicant' && normalizedName !== 'New' && normalizedName !== '') {
            // Create the missing person!
            const newId = crypto.randomUUID()
            match = { id: newId, name: normalizedName }
            people.push(match)
          }

          if (match) {
            s.personId = match.id
          } else if (people.length > 0) {
            s.personId = people[0]!.id
          }
        }
      })

      // Pass 2: If we have multiple people and one is "Applicant 1" with no income, remove it
      if (people.length > 1) {
        const applicantIdx = people.findIndex(p => p.name === 'Applicant 1')
        if (applicantIdx !== -1) {
            const applicant = people[applicantIdx]
            const hasIncome = (config.value.incomeSources || []).some(s => s.personId === applicant!.id)
            if (!hasIncome) {
              people.splice(applicantIdx, 1)
            }
        }
      }

      // Pass 3: Add default investment strategy if missing
      if (!config.value.deposit.investmentStrategy) {
        config.value.deposit.investmentStrategy = {
          allocations: [{ symbol: 'IVV.AU', weight: 1.0 }],
          brokerFee: 2,
          minimumInvestment: 500,
          reviewCadence: 'fortnightly'
        }
      }

      // Trigger price initialization for all holdings
      const symbols = config.value.deposit.holdings.map(h => h.symbol)
      stockPrices.initializePrices(symbols)
    } catch (e) {
      console.error('Failed to load config', e)
    }
  }

  function migrateFromV1(old: any): any {
    const incomeSources: any[] = []
    
    // Migrate primary TMN income
    if (old.income) {
      incomeSources.push({
        id: crypto.randomUUID(),
        name: 'Applicant 1',
        type: 'tmn',
        startDate: null,
        endDate: null,
        tmn: {
          currentAmount: old.deposit?.currentTmn ?? old.income.tmn,
          targetAmount: old.income.tmn,
          partnerCommitments: old.deposit?.currentTmn ?? old.income.tmn,
          increaseIntervalMonths: old.deposit?.tmnIncreaseIntervalMonths ?? 6,
          mmr: old.income.mmr ?? 0,
          giving: old.income.giving ?? 0,
          postTaxSuper: old.income.postTaxSuper ?? 0,
          hasHecsDebt: old.income.hasHecsDebt ?? false,
          hecsBalance: old.income.hecsBalance ?? 0,
        }
      })
    }
    
    // Migrate spouse salary
    if (old.spouse?.grossSalary > 0) {
      incomeSources.push({
        id: crypto.randomUUID(),
        name: 'Applicant 2',
        type: 'salary',
        startDate: null,
        endDate: null,
        salary: {
          grossAnnual: old.spouse.grossSalary,
          hasHecsDebt: (old.spouse.hecsDebt ?? 0) > 0,
          hecsBalance: old.spouse.hecsDebt ?? 0,
        }
      })
    }

    // Return the parts that need updating
    return {
      incomeSources,
      deposit: {
        ...old.deposit,
        // Remove old fields that are now in incomeSources
        currentTmn: undefined,
        tmnIncreaseIntervalMonths: undefined,
        spouseBudgetIncome: undefined
      },
      loan: old.loan,
      costs: old.costs
    }
  }

  const smartResult = computed(() => {
    return calculateSmartProjection(
      config.value.people,
      config.value.incomeSources,
      config.value.deposit,
      config.value.budget,
      stockPrices.stockData.value
    )
  })

  const PARTIAL_MONTH_THRESHOLD = 0.25

  const displaySeries = computed(() => {
    const full = smartResult.value.series
    if (full.length === 0) return full
    
    let result = [...full]
    
    // Exclude first month if:
    // 1. It's too small (threshold)
    // 2. OR it has zero net income (creates a "ramp" in charts)
    if (result.length > 0) {
      const first = result[0]
      if (first) {
        const tooSmall = first.isPartialMonth && (first.prorationFactor || 0) < PARTIAL_MONTH_THRESHOLD
        const zeroIncome = first.netIncome === 0
        
        if (tooSmall || zeroIncome) {
          result.shift()
        }
      }
    }
    
    // Exclude last partial month if too small
    if (result.length > 0) {
      const last = result[result.length - 1]
      if (last && last.isPartialMonth && (last.prorationFactor || 0) < PARTIAL_MONTH_THRESHOLD) {
        result.pop()
      }
    }
    
    return result
  })

  const projectedDeposit = computed(() => {
    return smartResult.value.finalDeposit
  })

  return {
    config,
    addPerson,
    removePerson,
    addIncomeSource,
    removeIncomeSource,
    initialise,
    sync,
    smartResult,
    displaySeries,
    projectedDeposit
  }
})

