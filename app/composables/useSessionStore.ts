import { defineStore } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import { calculateSmartProjection } from '~/composables/useSmartProjection'
import { useStockPrices } from '~/composables/useStockPrices'
import type { IncomeType, IncomeSource, Person, SessionConfig } from '../types'

const DEFAULT_CONFIG: SessionConfig = {
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
    targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
    journeyStartDate: new Date().toISOString().split('T')[0],
    investmentStrategy: {
      allocations: [{ symbol: 'IVV.AX', weight: 1.0 }],
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
} as SessionConfig

export const useSessionStore = defineStore('session', () => {
  const stockPrices = useStockPrices()
  
  // ============================================
  // STATE
  // ============================================
  const config = ref<SessionConfig>(structuredClone(DEFAULT_CONFIG))
  const isLoading = ref(false)
  const isSyncing = ref(false)
  const error = ref<any>(null)
  const isLoaded = ref(false)

  // UI State
  const isSidebarOpen = ref(true)
  const activeTab = ref('overview')

  // ============================================
  // ACTIONS
  // ============================================
  async function load() {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<{ config: SessionConfig; updatedAt: number }>('/api/session')
      if (data?.config) {
        // Deep merge server config with defaults to ensure all nested objects exist
        config.value = {
          ...structuredClone(DEFAULT_CONFIG),
          ...data.config,
          budget: {
            ...structuredClone(DEFAULT_CONFIG.budget),
            ...data.config.budget,
          },
          deposit: {
            ...structuredClone(DEFAULT_CONFIG.deposit),
            ...data.config.deposit,
          },
          loan: {
            ...structuredClone(DEFAULT_CONFIG.loan),
            ...data.config.loan,
          },
          costs: {
            ...structuredClone(DEFAULT_CONFIG.costs),
            ...data.config.costs,
          },
        }
        isLoaded.value = true

        // Initialize stock prices from cache/API
        const symbols = [
          ...(config.value.deposit.holdings?.map(h => h.symbol) || []),
          ...(config.value.deposit.investmentStrategy?.allocations?.map(a => a.symbol) || [])
        ].filter(Boolean)
        
        if (symbols.length > 0) {
          stockPrices.initializePrices(symbols)
        }
      }
    } catch (err: any) {
      error.value = err
      console.error('Failed to load session:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function save() {
    if (!isLoaded.value) return
    isSyncing.value = true
    try {
      await $fetch('/api/session', {
        method: 'PUT',
        body: { config: config.value }
      })
    } catch (err: any) {
      console.error('Failed to save session:', err)
    } finally {
      isSyncing.value = false
    }
  }

  // Auto-save on changes
  watchDebounced(
    config,
    () => {
      save()
    },
    { debounce: 2000, deep: true }
  )

  function addPerson(name: string = 'New Person'): Person {
    const person: Person = {
      id: crypto.randomUUID(),
      name
    }
    config.value.people.push(person)
    return person
  }

  function removePerson(id: string): void {
    if (config.value.people.length <= 1) return
    const idx = config.value.people.findIndex((p: any) => p.id === id)
    if (idx !== -1) config.value.people.splice(idx, 1)
    config.value.incomeSources = config.value.incomeSources.filter((s: any) => s.personId !== id)
  }

  function addIncomeSource(type: IncomeType, personId?: string): IncomeSource {
    const targetPersonId: string = personId || config.value.people[0]?.id || ''
    const count = config.value.incomeSources.filter((s: any) => s.type === type).length + 1
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
      base.salary = { grossAnnual: 0 }
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
    const idx = config.value.incomeSources.findIndex((s: any) => s.id === id)
    if (idx !== -1) config.value.incomeSources.splice(idx, 1)
  }

  // ============================================
  // COMPUTED
  // ============================================
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
    if (result.length > 0) {
      const first = result[0]
      if (first) {
        const tooSmall = first.isPartialMonth && (first.prorationFactor || 0) < PARTIAL_MONTH_THRESHOLD
        const zeroIncome = first.netIncome === 0
        if (tooSmall || zeroIncome) result.shift()
      }
    }
    
    if (result.length > 0) {
      const last = result[result.length - 1]
      if (last && last.isPartialMonth && (last.prorationFactor || 0) < PARTIAL_MONTH_THRESHOLD) {
        result.pop()
      }
    }
    return result
  })

  const projectedDeposit = computed(() => smartResult.value.finalDeposit)

  return {
    config,
    isLoading,
    isSyncing,
    isLoaded,
    error,
    load,
    save,
    addPerson,
    removePerson,
    addIncomeSource,
    removeIncomeSource,
    smartResult,
    displaySeries,
    projectedDeposit,
    isSidebarOpen,
    activeTab
  }
})
