const CACHE = new Map<string, number>()

/**
 * Fetches exchange rate from frankfurter.app (Free, no key, official ECB data)
 * @param from Source currency (e.g. USD)
 * @param to Target currency (e.g. AUD)
 * @param date Date in YYYY-MM-DD format
 */
export async function getExchangeRate(
  from: string,
  to: string,
  date: string
): Promise<number | null> {
  const source = from.toUpperCase()
  const target = to.toUpperCase()
  
  if (source === target) return 1
  
  const cacheKey = `${source}_${target}_${date}`
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey)!
  
  try {
    // Frankfurter API supports historical rates back to 1999
    // Format: https://api.frankfurter.app/2024-12-24?from=USD&to=AUD
    // For future dates or weekends, use 'latest'
    const today = new Date().toISOString().split('T')[0]!
    const effectiveDate = date > today ? 'latest' : date
    
    const url = `https://api.frankfurter.app/${effectiveDate}?from=${source}&to=${target}`
    
    console.log(`[Exchange] Fetching rate: ${source} -> ${target} for ${effectiveDate}${effectiveDate !== date ? ` (requested: ${date})` : ''}`)
    const res = await fetch(url)
    
    if (!res.ok) {
      if (res.status === 404) {
        // Try 'latest' as fallback (weekends/holidays don't have rates)
        console.warn(`[Exchange] Rate not available for date ${effectiveDate}. Trying latest...`)
        const fallbackRes = await fetch(`https://api.frankfurter.app/latest?from=${source}&to=${target}`)
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          const rate = fallbackData.rates?.[target]
          if (typeof rate === 'number') {
            CACHE.set(cacheKey, rate)
            return rate
          }
        }
        return null
      }
      throw new Error(`Frankfurter API returned ${res.status}`)
    }
    
    const data = await res.json()
    const rate = data.rates?.[target]
    
    if (typeof rate === 'number') {
      CACHE.set(cacheKey, rate)
      return rate
    }
    
    console.warn(`[Exchange] Rate for ${target} not found in response for ${date}`)
    return null
  } catch (e) {
    console.error(`[Exchange] Error fetching rate for ${source} on ${date}:`, e)
    return null
  }
}
