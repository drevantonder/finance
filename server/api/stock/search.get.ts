import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = query.q as string

  if (!q || q.length < 2) {
    return { results: [] }
  }

  try {
    const searchResults = await yahooFinance.search(q) as any
    
    const results = (searchResults.quotes || [])
      .filter((quote: any) => 
        ['EQUITY', 'ETF', 'INDEX'].includes(quote.quoteType) || 
        ['EQUITY', 'ETF'].includes(quote.typeDisp)
      )
      .map((quote: any) => ({
        symbol: quote.symbol.includes('.') ? quote.symbol.split('.')[0] : quote.symbol,
        fullSymbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.name,
        exchange: quote.exchange,
        type: quote.quoteType || quote.typeDisp,
        currency: quote.currency || 'AUD' // Default to AUD if missing, will be corrected by quote call
      }))
      // Prioritize Australian exchange
      .sort((a: any, b: any) => {
        const aIsAU = a.exchange === 'ASX' || a.fullSymbol.endsWith('.AX')
        const bIsAU = b.exchange === 'ASX' || b.fullSymbol.endsWith('.AX')
        if (aIsAU && !bIsAU) return -1
        if (!aIsAU && bIsAU) return 1
        return 0
      })

    return { results }
  } catch (error) {
    console.error('[StockSearch] Error:', error)
    return { results: [], error: 'Failed to search stocks' }
  }
})
