import { db } from 'hub:db'
import { expenses } from '~~/server/db/schema'
import { sql } from 'drizzle-orm'

/**
 * Normalizes a merchant name for better matching
 * e.g. "Coles Supermarkets" -> "coles"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    // Remove common business suffixes and store types
    .replace(/\b(pty ltd|ltd|inc|corp|stores|supermarkets?|express|local|pharmacy|cafe|restaurant|station|bakery|market|shop)\b/g, '')
    // Remove anything that isn't a word character or space
    .replace(/[^\w\s]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  )

  for (let i = 0; i <= a.length; i++) {
    matrix[i]![0] = i
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0]![j] = j
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      )
    }
  }

  return matrix[a.length]![b.length]!
}

/**
 * Calculates similarity between two strings (0 to 1)
 */
function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeName(a)
  const normB = normalizeName(b)
  
  if (normA === normB) return 1
  if (normA.length === 0 || normB.length === 0) return 0

  const distance = levenshteinDistance(normA, normB)
  const maxLength = Math.max(normA.length, normB.length)
  return 1 - distance / maxLength
}

/**
 * Fetches existing merchants, sorted by frequency
 */
export async function getExistingMerchants(): Promise<string[]> {
  try {
    const result = await db
      .select({ merchant: expenses.merchant })
      .from(expenses)
      .groupBy(expenses.merchant)
      .orderBy(sql`count(*) DESC`)
      .limit(200)
      .all()

    return result.map(r => r.merchant).filter((m): m is string => !!m)
  } catch (err) {
    console.error('Failed to fetch existing merchants:', err)
    return []
  }
}

/**
 * Finds the best matching existing merchant for an extracted name
 */
export async function findMatchingMerchant(
  extracted: string, 
  threshold = 0.85
): Promise<string> {
  if (!extracted || extracted === 'Unknown') return extracted

  const existing = await getExistingMerchants()
  if (existing.length === 0) return extracted
  
  let bestMatch = extracted
  let highestSimilarity = 0

  for (const merchant of existing) {
    const similarity = calculateSimilarity(extracted, merchant)
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity
      bestMatch = merchant
    }
    // Early exit for perfect match
    if (highestSimilarity === 1) break
  }

  return highestSimilarity >= threshold ? bestMatch : extracted
}
