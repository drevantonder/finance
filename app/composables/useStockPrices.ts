import { ref, computed } from 'vue'

// Storage key for cached stock data
const STOCK_CACHE_KEY = 'house-progress-stock-cache-v4'
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours

// Default growth rate if we can't calculate from historical data
const DEFAULT_GROWTH_RATE = 0.07 // 7% - conservative global average

// Check if we're on client side
const isClient = typeof window !== 'undefined'

export interface CachedStockData {
  price: number
  currency: string
  name: string
  growthRates: {
    oneYear: number | null
    threeYear: number | null
    fiveYear: number | null
    tenYear: number | null
  }
  recommendedRate: number
  dividendYield: number
  totalReturnRate: number
  dataYears: number
  fetchedAt: number
}

interface StockCache {
  stocks: Record<string, CachedStockData>
  lastUpdate: number
}

// Track which symbols failed to fetch
const failedSymbols = ref<Set<string>>(new Set())

// Shared state for all instances
const stockData = ref<Record<string, CachedStockData>>({})
const loading = ref(false)
const lastFetched = ref<Date | null>(null)

export function useStockPrices() {
  
  // Load cached data from localStorage
  function loadCache(): StockCache | null {
    if (!isClient) return null
    try {
      const raw = localStorage.getItem(STOCK_CACHE_KEY)
      if (raw) {
        return JSON.parse(raw) as StockCache
      }
    } catch (e) {
      console.error('Failed to load stock cache', e)
    }
    return null
  }
  
  // Save data to localStorage
  function saveCache() {
    if (!isClient) return
    try {
      const cache: StockCache = {
        stocks: stockData.value,
        lastUpdate: Date.now()
      }
      localStorage.setItem(STOCK_CACHE_KEY, JSON.stringify(cache))
    } catch (e) {
      console.error('Failed to save stock cache', e)
    }
  }
  
  // Check if cache is stale
  function isCacheStale(cache: StockCache): boolean {
    return Date.now() - cache.lastUpdate > CACHE_DURATION_MS
  }
  
  // Fetch stock data from our internal server API
  async function fetchStockFromAPI(symbol: string): Promise<CachedStockData | null> {
    console.log(`[StockPrices] Fetching from server API: ${symbol}`)
    const { token } = useAuthToken()
    
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`, {
        headers: { 'x-auth-token': token.value }
      })
      if (!res.ok) {
        console.error(`[StockPrices] Failed to fetch ${symbol}: ${res.statusText}`)
        return null
      }
      return await res.json()
    } catch (e) {
      console.error(`Failed to fetch data for ${symbol}`, e)
      return null
    }
  }

  // Search for stocks using our internal server API
  async function searchStocks(query: string) {
    if (!query || query.length < 2) return []
    const { token } = useAuthToken()
    
    try {
      const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`, {
        headers: { 'x-auth-token': token.value }
      })
      if (!res.ok) return []
      const data = await res.json()
      return data.results || []
    } catch (e) {
      console.error('Search failed', e)
      return []
    }
  }
  
  // Pre-seed a price if we have it from search
  function seedPrice(symbol: string, price: number) {
    const upperSymbol = symbol.toUpperCase()
    if (!stockData.value[upperSymbol]) {
      stockData.value[upperSymbol] = {
        price,
        currency: 'AUD',
        name: symbol,
        growthRates: { oneYear: null, threeYear: null, fiveYear: null, tenYear: null },
        recommendedRate: DEFAULT_GROWTH_RATE,
        dividendYield: 0,
        totalReturnRate: DEFAULT_GROWTH_RATE,
        dataYears: 0,
        fetchedAt: Date.now()
      }
    } else {
      stockData.value[upperSymbol].price = price
    }
  }
  
  // Initialize data for multiple symbols
  async function initializePrices(symbols: string[]) {
    if (!isClient) return
    
    const cache = loadCache()
    const symbolsToFetch: string[] = []
    
    if (cache) {
      lastFetched.value = new Date(cache.lastUpdate)
      stockData.value = { ...cache.stocks } // Load all cached data
      
      for (const symbol of symbols) {
        const upperSymbol = symbol.toUpperCase()
        if (!cache.stocks[upperSymbol]) {
          symbolsToFetch.push(symbol)
        }
      }
      
      if (!isCacheStale(cache)) {
        if (symbolsToFetch.length > 0) {
           await refreshPrices(symbolsToFetch)
        }
        return
      }
    } else {
      symbolsToFetch.push(...symbols)
    }
    
    await refreshPrices(symbolsToFetch)
  }
  
  async function refreshPrices(symbols: string[], forceRefresh: boolean = false) {
    loading.value = true
    failedSymbols.value.clear()
    
    try {
      for (const symbol of symbols) {
        if (!symbol) continue
        
        const upperSymbol = symbol.toUpperCase()
        
        if (!forceRefresh) {
          const existing = stockData.value[upperSymbol]
          if (existing && Date.now() - existing.fetchedAt < CACHE_DURATION_MS) continue
        }

        const data = await fetchStockFromAPI(symbol)
        if (data) {
          stockData.value[upperSymbol] = data
          failedSymbols.value.delete(upperSymbol)
        } else {
          failedSymbols.value.add(upperSymbol)
        }
      }
      saveCache()
      lastFetched.value = new Date()
    } finally {
      loading.value = false
    }
  }

  // Fetch data for a single new symbol
  async function fetchNewSymbol(symbol: string): Promise<CachedStockData | null> {
    const upperSymbol = symbol.toUpperCase()
    
    // Check cache first
    const cache = loadCache()
    if (cache?.stocks[upperSymbol] && !isCacheStale(cache)) {
        stockData.value[upperSymbol] = cache.stocks[upperSymbol]
        return cache.stocks[upperSymbol]
    }

    loading.value = true
    try {
      const data = await fetchStockFromAPI(symbol)
      if (data) {
        stockData.value[upperSymbol] = data
        failedSymbols.value.delete(upperSymbol)
        saveCache()
        return data
      }
      failedSymbols.value.add(upperSymbol)
      return null
    } finally {
      loading.value = false
    }
  }
  
  // Check if a symbol has valid data
  function hasValidData(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase()
    return !!stockData.value[upperSymbol] || !!loadCache()?.stocks[upperSymbol]
  }
  
  // Check if a symbol failed to fetch
  function hasFailed(symbol: string): boolean {
    return failedSymbols.value.has(symbol.toUpperCase())
  }
  
  // Get data for a symbol (returns null if not available)
  function getStockData(symbol: string): CachedStockData | null {
    const upperSymbol = symbol.toUpperCase()
    
    if (stockData.value[upperSymbol]) {
      return stockData.value[upperSymbol]
    }
    
    // Check cache
    const cache = loadCache()
    if (cache?.stocks[upperSymbol]) {
      stockData.value[upperSymbol] = cache.stocks[upperSymbol]
      return cache.stocks[upperSymbol]
    }
    
    return null
  }
  
  // Convenience getters - return null if no data
  function getPrice(symbol: string): number | null {
    const data = getStockData(symbol)
    return data?.price ?? null
  }
  
  function getGrowthRate(symbol: string): number {
    const data = getStockData(symbol)
    return data?.recommendedRate ?? DEFAULT_GROWTH_RATE
  }
  
  function getDividendYield(symbol: string): number {
    const data = getStockData(symbol)
    return data?.dividendYield ?? 0
  }
  
  function getTotalReturnRate(symbol: string): number {
    const data = getStockData(symbol)
    return data?.totalReturnRate ?? DEFAULT_GROWTH_RATE
  }
  
  return {
    stockData: computed(() => stockData.value),
    loading: computed(() => loading.value),
    lastFetched: computed(() => lastFetched.value),
    failedSymbols: computed(() => failedSymbols.value),
    getPrice,
    getGrowthRate,
    getDividendYield,
    getTotalReturnRate,
    getStockData,
    hasValidData,
    hasFailed,
    initializePrices,
    refreshPrices,
    fetchNewSymbol,
    searchStocks,
    seedPrice
  }
}
