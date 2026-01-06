import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Global setup
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'test-uuid-1234'),
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSessionStore Integration Tests', () => {
  it('initializes with default config values', async () => {
    // Mock $fetch before importing the store
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    expect(store.config).toBeDefined()
    expect(store.config.people).toEqual([])
    expect(store.config.incomeSources).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.isLoaded).toBe(false)
    expect(store.error).toBe(null)
  })

  it('loads session from API', async () => {
    const mockConfig = {
      people: [{ id: '1', name: 'Test Person' }],
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
      },
    }

    global.$fetch = vi.fn().mockResolvedValue({
      config: mockConfig,
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    await store.load()

    expect($fetch).toHaveBeenCalledWith('/api/session')
    expect(store.isLoaded).toBe(true)
    expect(store.isLoading).toBe(false)
    expect(store.config.people).toEqual([{ id: '1', name: 'Test Person' }])
    expect(store.config.deposit.cashSavings).toBe(10000)
  })

  it('saves session to API', async () => {
    // First mock: load returns default
    global.$fetch = vi.fn().mockResolvedValueOnce({
      config: {
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    await store.load()

    // Second mock: save returns success
    global.$fetch = vi.fn().mockResolvedValueOnce({
      success: true,
      updatedAt: Date.now(),
    })

    await store.save()

    expect($fetch).toHaveBeenCalledWith('/api/session', {
      method: 'PUT',
      body: { config: expect.any(Object) },
    })
    expect(store.isSyncing).toBe(false)
  })

  it('adds a person', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    const person = store.addPerson('John Doe')

    expect(person).toBeDefined()
    expect(person.name).toBe('John Doe')
    expect(person.id).toBe('test-uuid-1234')
    expect(store.config.people).toHaveLength(1)
    expect(store.config.people[0]).toEqual(person)
  })

  it('removes a person', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
        people: [{ id: 'person-1', name: 'Alice' }, { id: 'person-2', name: 'Bob' }],
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    const initialLength = store.config.people.length
    store.removePerson('person-1')

    expect(store.config.people).toHaveLength(initialLength - 1)
    expect(store.config.people.find((p: any) => p.id === 'person-1')).toBeUndefined()
  })

  it('does not remove the last person', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
        people: [{ id: 'only-person', name: 'Only One' }],
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    store.removePerson('only-person')

    expect(store.config.people).toHaveLength(1)
  })

  it('removes income sources when person is removed', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
        people: [
          { id: 'person-1', name: 'Alice' },
          { id: 'person-2', name: 'Bob' },
        ],
        incomeSources: [
          { id: 'income-1', personId: 'person-1', name: 'Alice Salary', type: 'salary', startDate: null, endDate: null },
          { id: 'income-2', personId: 'person-2', name: 'Bob Salary', type: 'salary', startDate: null, endDate: null },
        ],
        budget: {
          budgetItems: [],
          oneOffExpenses: [],
          oneOffDeposits: [],
          emergencyFloor: 2000,
          emergencyTarget: 4000,
        },
        deposit: {
          cashSavings: 0,
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    const initialIncomeCount = store.config.incomeSources.length
    store.removePerson('person-1')

    expect(store.config.incomeSources).toHaveLength(initialIncomeCount - 1)
    expect(store.config.incomeSources.find((s: any) => s.id === 'income-1')).toBeUndefined()
    expect(store.config.incomeSources.find((s: any) => s.personId === 'person-1')).toBeUndefined()
  })

  it('adds an income source', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
        people: [{ id: 'person-1', name: 'Alice' }],
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    const incomeSource = store.addIncomeSource('salary', 'person-1')

    expect(incomeSource).toBeDefined()
    expect(incomeSource.type).toBe('salary')
    expect(incomeSource.personId).toBe('person-1')
    expect(incomeSource.name).toBe('Salary #1')
    expect(incomeSource.salary).toBeDefined()
    expect(incomeSource.salary?.grossAnnual).toBe(0)
    expect(store.config.incomeSources).toHaveLength(1)
  })

  it('adds TMN income source with correct defaults', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
        people: [{ id: 'person-1', name: 'Alice' }],
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    const tmnSource = store.addIncomeSource('tmn', 'person-1')

    expect(tmnSource.type).toBe('tmn')
    expect(tmnSource.name).toBe('TMN #1')
    expect(tmnSource.tmn).toBeDefined()
    expect(tmnSource.tmn?.currentAmount).toBe(0)
    expect(tmnSource.tmn?.targetAmount).toBe(0)
    expect(tmnSource.tmn?.increaseIntervalMonths).toBe(6)
  })

  it('removes an income source', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
        people: [{ id: 'person-1', name: 'Alice' }],
        incomeSources: [
          { id: 'income-1', personId: 'person-1', name: 'Salary', type: 'salary', startDate: null, endDate: null },
        ],
        budget: {
          budgetItems: [],
          oneOffExpenses: [],
          oneOffDeposits: [],
          emergencyFloor: 2000,
          emergencyTarget: 4000,
        },
        deposit: {
          cashSavings: 0,
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    const initialCount = store.config.incomeSources.length
    store.removeIncomeSource('income-1')

    expect(store.config.incomeSources).toHaveLength(initialCount - 1)
    expect(store.config.incomeSources.find((s: any) => s.id === 'income-1')).toBeUndefined()
  })

  it('handles load error gracefully', async () => {
    const mockError = new Error('Network error')
    global.$fetch = vi.fn().mockRejectedValue(mockError)

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    await store.load()

    expect($fetch).toHaveBeenCalledWith('/api/session')
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe(mockError)
    expect(store.isLoaded).toBe(false)
  })

  it('computed smartResult returns projection data', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    expect(store.smartResult).toBeDefined()
    expect(store.smartResult.finalDeposit).toBeDefined()
    expect(store.smartResult.series).toBeDefined()
    expect(Array.isArray(store.smartResult.series)).toBe(true)
  })

  it('displaySeries filters out small partial months', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    const displaySeries = store.displaySeries

    expect(displaySeries).toBeDefined()
    expect(Array.isArray(displaySeries)).toBe(true)
  })

  it('projectedDeposit returns final deposit value', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    expect(store.projectedDeposit).toBeDefined()
    expect(typeof store.projectedDeposit).toBe('number')
  })

  it('does not save if not loaded', async () => {
    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    await store.save()

    expect($fetch).not.toHaveBeenCalled()
  })

  it('UI state is accessible', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      config: {
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
          fhssContributions: [],
          fhssSicRate: 0.0717,
          holdings: [],
          defaultGrowthRate: 6,
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
        },
      },
      updatedAt: Date.now(),
    })

    const { useSessionStore } = await import('~/composables/useSessionStore')
    const store = useSessionStore()

    expect(store.isSidebarOpen).toBeDefined()
    expect(store.activeTab).toBeDefined()
    expect(store.activeTab).toBe('overview')

    store.isSidebarOpen = false
    expect(store.isSidebarOpen).toBe(false)

    store.activeTab = 'deposit'
    expect(store.activeTab).toBe('deposit')
  })
})
