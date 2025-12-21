import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

function toYahooSymbol(symbol: string): string {
  const s = symbol.toUpperCase().trim()
  
  // .AU -> .AX (ASX)
  if (s.endsWith('.AU')) return s.replace('.AU', '.AX')
  
  // .US suffix, strip it
  if (s.endsWith('.US')) return s.replace('.US', '')
  
  return s
}

function calculateCAGR(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || endPrice <= 0 || years <= 0) return 0
  return Math.pow(endPrice / startPrice, 1 / years) - 1
}

export default defineEventHandler(async (event) => {
  const symbolParam = getRouterParam(event, 'symbol')
  if (!symbolParam) {
    throw createError({ statusCode: 400, message: 'Symbol is required' })
  }

  const symbol = toYahooSymbol(symbolParam)

  try {
    // 1. Get current quote for price and basic info
    const quote = await yahooFinance.quote(symbol) as any
    
    // 2. Get historical data for growth calculation
    // We want up to 10 years if possible
    const now = new Date()
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(now.getFullYear() - 10)
    
    const history = await yahooFinance.historical(symbol, {
      period1: tenYearsAgo,
      period2: now,
      interval: '1mo' // Monthly is enough for CAGR
    }) as any[]

    if (!history || history.length === 0) {
      const dividendYield = quote.trailingAnnualDividendYield || 0
      const recommendedRate = 0.07
      return {
        symbol,
        price: quote.regularMarketPrice || 0,
        currency: quote.currency,
        name: quote.shortName || quote.longName || symbol,
        growthRates: { oneYear: null, threeYear: null, fiveYear: null, tenYear: null },
        recommendedRate,
        dividendYield,
        totalReturnRate: recommendedRate + dividendYield,
        dataYears: 0,
        fetchedAt: Date.now()
      }
    }

    const lastEntry = history[history.length - 1]
    const currentPrice = quote.regularMarketPrice || lastEntry.adjClose || lastEntry.close

    // Helper to find entry closest to N years ago
    const findHistoricalPrice = (yearsAgo: number) => {
      const targetDate = new Date()
      targetDate.setFullYear(targetDate.getFullYear() - yearsAgo)
      
      // Find the entry closest to but not after targetDate
      let closest = history[0]
      for (const entry of history) {
        if (new Date(entry.date) <= targetDate) {
          closest = entry
        } else {
          break
        }
      }
      
      const yearsDiff = (new Date(lastEntry.date).getTime() - new Date(closest.date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      
      // Only return if we actually have enough history
      if (yearsDiff < yearsAgo * 0.8) return null
      
      return {
        price: closest.adjClose || closest.close,
        actualYears: yearsDiff
      }
    }

    const oneYr = findHistoricalPrice(1)
    const threeYr = findHistoricalPrice(3)
    const fiveYr = findHistoricalPrice(5)
    const tenYr = findHistoricalPrice(10)

    const growthRates = {
      oneYear: oneYr ? calculateCAGR(oneYr.price, currentPrice, oneYr.actualYears) : null,
      threeYear: threeYr ? calculateCAGR(threeYr.price, currentPrice, threeYr.actualYears) : null,
      fiveYear: fiveYr ? calculateCAGR(fiveYr.price, currentPrice, fiveYr.actualYears) : null,
      tenYear: tenYr ? calculateCAGR(tenYr.price, currentPrice, tenYr.actualYears) : null
    }

    // Recommended Rate Logic:
    // Prefer 5yr -> 3yr -> 10yr -> 1yr (with haircut)
    let recommendedRate = 0.07
    let dataYears = 0

    if (growthRates.fiveYear !== null) {
      recommendedRate = growthRates.fiveYear
      dataYears = 5
    } else if (growthRates.threeYear !== null) {
      recommendedRate = growthRates.threeYear
      dataYears = 3
    } else if (growthRates.tenYear !== null) {
      recommendedRate = growthRates.tenYear
      dataYears = 10
    } else if (growthRates.oneYear !== null) {
      recommendedRate = growthRates.oneYear * 0.7 // 30% haircut for short history
      dataYears = 1
    }

    // Clamp between 2% and 15%
    recommendedRate = Math.max(0.02, Math.min(0.15, recommendedRate))

    // Extract dividend yield (trailing 12-month yield)
    const dividendYield = quote.trailingAnnualDividendYield || 0
    const totalReturnRate = recommendedRate + dividendYield

    return {
      symbol: quote.symbol,
      price: currentPrice,
      currency: quote.currency,
      name: quote.shortName || quote.longName || symbol,
      growthRates,
      recommendedRate,
      dividendYield,
      totalReturnRate,
      dataYears,
      fetchedAt: Date.now()
    }

  } catch (error: any) {
    console.error(`[StockAPI] Error fetching ${symbol}:`, error)
    throw createError({
      statusCode: 500,
      message: `Failed to fetch data for ${symbol}: ${error.message}`
    })
  }
})
