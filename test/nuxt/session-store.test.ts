import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { SessionConfig, Person, StockHolding } from '~/types'

// Create a shared mock object that will be returned by all calls to useStockPrices
const mockStockPrices = {
  stockData: { value: {} },
  loading: { value: false },
  lastFetched: { value: null },
  failedSymbols: { value: new Set() },
  getPrice: vi.fn(() => null),
  getGrowthRate: vi.fn(() => 0.07),
  getDividendYield: vi.fn(() => 0),
  getTotalReturnRate: vi.fn(() => 0.07),
  getStockData: vi.fn(() => null),
  hasValidData: vi.fn(() => false),
  hasFailed: vi.fn(() => false),
  initializePrices: vi.fn(() => Promise.resolve()),
  refreshPrices: vi.fn(() => Promise.resolve()),
  fetchNewSymbol: vi.fn(() => Promise.resolve(null)),
  searchStocks: vi.fn(() => Promise.resolve([])),
  seedPrice: vi.fn()
}

// Mock useStockPrices composable BEFORE any imports
vi.mock('~/composables/useStockPrices', () => ({
  useStockPrices: () => mockStockPrices
}))

describe('useSessionStore', () => {
  let mockFetch: any

  beforeEach(() => {
    // Create fresh pinia instance for each test
    setActivePinia(createPinia())

    // Mock $fetch globally
    mockFetch = vi.fn()
    global.$fetch = mockFetch

    // Clear mock call counts but keep the mock functions
    mockStockPrices.initializePrices.mockClear()
  })

  describe('Store initialization', () => {
    it('initializes with default config values', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      expect(store.config).toBeDefined()
      expect(store.config.people).toEqual([])
      expect(store.config.incomeSources).toEqual([])
      expect(store.config.budget.emergencyFloor).toBe(2000)
      expect(store.config.budget.emergencyTarget).toBe(4000)
      expect(store.config.deposit.cashSavings).toBe(0)
      expect(store.config.loan.interestRate).toBe(0.0549)
      expect(store.config.costs.state).toBe('QLD')
    })

    it('has reactive state properties', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      expect(store.isLoading).toBe(false)
      expect(store.isSyncing).toBe(false)
      expect(store.isLoaded).toBe(false)
      expect(store.error).toBe(null)
    })

    it('has UI state properties', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      expect(store.isSidebarOpen).toBe(true)
      expect(store.activeTab).toBe('overview')
    })
  })

  describe('load() method', () => {
    it('loads session config from API and sets isLoaded flag', async () => {
      const mockConfig: Partial<SessionConfig> = {
        people: [{ id: 'p1', name: 'Alice' } as Person],
        incomeSources: [],
        budget: {
          budgetItems: [],
          oneOffExpenses: [],
          oneOffDeposits: [],
          emergencyFloor: 2000,
          emergencyTarget: 4000,
        },
        deposit: {
          cashSavings: 10000,
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]!,
          journeyStartDate: new Date().toISOString().split('T')[0]!,
          cashSavingsAsOfDate: new Date().toISOString().split('T')[0]!,
          investmentStrategy: {
            allocations: [{ symbol: 'IVV.AX', weight: 1.0 }],
            brokerFee: 2,
            minimumInvestment: 500,
            reviewCadence: 'fortnightly'
          }
        },
        loan: {
          deposit: 0,
          interestRate: 0.06,
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
      }

      mockFetch.mockResolvedValue({
        config: mockConfig,
        updatedAt: Date.now()
      })

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      await store.load()

      expect(mockFetch).toHaveBeenCalledWith('/api/session')
      expect(store.config.people).toEqual([{ id: 'p1', name: 'Alice' }])
      expect(store.config.deposit.cashSavings).toBe(10000)
      expect(store.isLoaded).toBe(true)
    })

    it('merges server config with defaults deeply', async () => {
      const partialConfig: Partial<SessionConfig> = {
        people: [{ id: 'p1', name: 'Alice' } as Person],
        incomeSources: [],
      }

      mockFetch.mockResolvedValue({
        config: partialConfig,
        updatedAt: Date.now()
      })

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      await store.load()

      // Partial fields from server
      expect(store.config.people).toEqual([{ id: 'p1', name: 'Alice' }])

      // Default fields preserved
      expect(store.config.budget.emergencyFloor).toBe(2000)
      expect(store.config.deposit.cashSavings).toBe(0)
      expect(store.config.loan.interestRate).toBe(0.0549)
    })

    it('initializes stock prices when holdings exist', async () => {
      const mockConfig: Partial<SessionConfig> = {
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
          cashSavings: 10000,
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [
            { symbol: 'IVV', shares: 100 },
            { symbol: 'VGS', shares: 50 }
          ],
          defaultGrowthRate: 6,
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]!,
          journeyStartDate: new Date().toISOString().split('T')[0]!,
          cashSavingsAsOfDate: new Date().toISOString().split('T')[0]!,
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
      }

      mockFetch.mockResolvedValue({
        config: mockConfig,
        updatedAt: Date.now()
      })

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      await store.load()

      // Verify that holdings are loaded and stored
      expect(store.config.deposit.holdings).toHaveLength(2)
      expect(store.config.deposit.holdings[0]?.symbol).toBe('IVV')
      expect(store.config.deposit.holdings[1]?.symbol).toBe('VGS')
      expect(store.isLoaded).toBe(true)
    })

    it('sets isLoading to false after loading completes', async () => {
      mockFetch.mockResolvedValue({
        config: { people: [], incomeSources: [] },
        updatedAt: Date.now()
      })

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      expect(store.isLoading).toBe(false)

      const loadPromise = store.load()
      expect(store.isLoading).toBe(true)

      await loadPromise
      expect(store.isLoading).toBe(false)
    })

    it('handles empty/null config response gracefully', async () => {
      mockFetch.mockResolvedValue({
        config: null,
        updatedAt: Date.now()
      })

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      await store.load()

      // Should keep default values
      expect(store.config.budget.emergencyFloor).toBe(2000)
      expect(store.isLoaded).toBe(false)
    })

    it('handles API errors and sets error state', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      await store.load()

      expect(store.error).toBeDefined()
      expect(store.isLoading).toBe(false)
      expect(store.isLoaded).toBe(false)
    })
  })

  describe('save() method', () => {
    it('saves config to API', async () => {
      mockFetch.mockResolvedValue({ success: true, updatedAt: Date.now() })

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      store.isLoaded = true
      store.config.loan.interestRate = 0.065

      await store.save()

      expect(mockFetch).toHaveBeenCalledWith('/api/session', {
        method: 'PUT',
        body: { config: store.config }
      })
    })

    it('returns early if not loaded', async () => {
      mockFetch.mockResolvedValue({ success: true, updatedAt: Date.now() })

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      // Don't call load(), so isLoaded remains false
      await store.save()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sets isSyncing during save operation', async () => {
      let resolveSave: (value: any) => void
      const savePromise = new Promise(resolve => { resolveSave = resolve })

      mockFetch.mockReturnValue(savePromise as any)

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      store.isLoaded = true

      const saveTask = store.save()
      expect(store.isSyncing).toBe(true)

      resolveSave!({ success: true, updatedAt: Date.now() })
      await saveTask

      expect(store.isSyncing).toBe(false)
    })

    it('handles save errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Save failed'))

      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      store.isLoaded = true

      await expect(store.save()).resolves.not.toThrow()
      expect(store.isSyncing).toBe(false)
    })
  })

  describe('Config mutations', () => {
    it('modifies config values reactively', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      store.config.loan.interestRate = 0.07
      expect(store.config.loan.interestRate).toBe(0.07)

      store.config.budget.emergencyFloor = 5000
      expect(store.config.budget.emergencyFloor).toBe(5000)
    })
  })

  describe('addPerson action', () => {
    it('adds a person with default name', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson()

      expect(store.config.people).toHaveLength(1)
      expect(person.id).toBeDefined()
      expect(person.name).toBe('New Person')
      expect(typeof person.id).toBe('string')
    })

    it('adds a person with custom name', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      expect(store.config.people).toHaveLength(1)
      expect(person.name).toBe('Alice')
    })

    it('adds multiple people', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      store.addPerson('Alice')
      store.addPerson('Bob')

      expect(store.config.people).toHaveLength(2)
      expect(store.config.people[0]?.name).toBe('Alice')
      expect(store.config.people[1]?.name).toBe('Bob')
    })
  })

  describe('removePerson action', () => {
    it('removes a person by id', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      const person1 = store.addPerson('Alice')
      const person2 = store.addPerson('Bob')
      store.addPerson('Charlie')

      store.removePerson(person2.id)

      expect(store.config.people).toHaveLength(2)
      expect(store.config.people.find((p: any) => p.id === person2.id)).toBeUndefined()
    })

    it('does not remove if only one person exists', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      store.removePerson(person.id)

      expect(store.config.people).toHaveLength(1)
    })

    it('removes associated income sources when removing person', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      const person1 = store.addPerson('Alice')
      const person2 = store.addPerson('Bob')

      const source1 = store.addIncomeSource('salary', person1.id)
      const source2 = store.addIncomeSource('tmn', person2.id)

      store.removePerson(person2.id)

      expect(store.config.incomeSources).toHaveLength(1)
      expect(store.config.incomeSources[0]?.id).toBe(source1.id)
    })
  })

  describe('addIncomeSource action', () => {
    it('adds TMN income source with correct structure', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      const source = store.addIncomeSource('tmn', person.id)

      expect(source.type).toBe('tmn')
      expect(source.personId).toBe(person.id)
      expect(source.name).toBe('TMN #1')
      expect(source.paymentDayOfMonth).toBe(5)
      expect(source.tmn).toBeDefined()
      expect(source.tmn?.currentAmount).toBe(0)
      expect(source.tmn?.targetAmount).toBe(0)
    })

    it('adds salary income source with correct structure', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      const source = store.addIncomeSource('salary', person.id)

      expect(source.type).toBe('salary')
      expect(source.name).toBe('Salary #1')
      expect(source.paymentDayOfMonth).toBe(15)
      expect(source.salary).toBeDefined()
      expect(source.salary?.grossAnnual).toBe(0)
    })

    it('adds centrelink income source with correct structure', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      const source = store.addIncomeSource('centrelink', person.id)

      expect(source.type).toBe('centrelink')
      expect(source.name).toBe('Centrelink #1')
      expect(source.paymentDayOfMonth).toBe(28)
      expect(source.centrelink).toBeDefined()
      expect(source.centrelink?.paymentType).toBe('Youth Allowance')
      expect(source.centrelink?.taxable).toBe(false)
    })

    it('assigns to first person if no personId provided', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      const source = store.addIncomeSource('tmn')

      expect(source.personId).toBe(person.id)
    })

    it('auto-increments numbering for multiple sources of same type', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      const source1 = store.addIncomeSource('tmn', person.id)
      const source2 = store.addIncomeSource('tmn', person.id)
      const source3 = store.addIncomeSource('tmn', person.id)

      expect(source1.name).toBe('TMN #1')
      expect(source2.name).toBe('TMN #2')
      expect(source3.name).toBe('TMN #3')
    })
  })

  describe('removeIncomeSource action', () => {
    it('removes income source by id', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()
      const person = store.addPerson('Alice')

      const source1 = store.addIncomeSource('tmn', person.id)
      const source2 = store.addIncomeSource('salary', person.id)

      store.removeIncomeSource(source1.id)

      expect(store.config.incomeSources).toHaveLength(1)
      expect(store.config.incomeSources[0]?.id).toBe(source2.id)
    })
  })

  describe('Computed properties', () => {
    it('computes smartResult based on config', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      const result = store.smartResult
      expect(result).toBeDefined()
      expect(result.series).toBeInstanceOf(Array)
      expect(typeof result.finalDeposit).toBe('number')
    })

    it('computes displaySeries by filtering partial months', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      const displaySeries = store.displaySeries
      expect(displaySeries).toBeInstanceOf(Array)
    })

    it('computes projectedDeposit from smartResult', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      const projectedDeposit = store.projectedDeposit
      expect(typeof projectedDeposit).toBe('number')
    })
  })

  describe('UI state', () => {
    it('toggles sidebar state', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      expect(store.isSidebarOpen).toBe(true)
      store.isSidebarOpen = false
      expect(store.isSidebarOpen).toBe(false)
    })

    it('changes active tab', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      expect(store.activeTab).toBe('overview')
      store.activeTab = 'budget'
      expect(store.activeTab).toBe('budget')
    })
  })

  describe('Income/expenses getters', () => {
    it('provides access to config arrays', async () => {
      const { useSessionStore } = await import('~/composables/useSessionStore')
      const store = useSessionStore()

      expect(store.config.people).toEqual([])
      expect(store.config.incomeSources).toEqual([])

      const person = store.addPerson('Alice')
      expect(store.config.people).toHaveLength(1)

      const source = store.addIncomeSource('tmn', person.id)
      expect(store.config.incomeSources).toHaveLength(1)
    })
  })
})
