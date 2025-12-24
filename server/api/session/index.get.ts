import { db } from 'hub:db'
import { sessions } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { setNoStore } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  setNoStore(event)
  
  try {
    const result = await db.select()
      .from(sessions)
      .where(eq(sessions.id, 'default'))
      .limit(1)

    if (!result || result.length === 0) {
      // Create default session if it doesn't exist
      const defaultConfig = {
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
      }

      const now = new Date()
      const serialized = JSON.stringify(defaultConfig)
      
      await db.insert(sessions).values({
        id: 'default',
        config: serialized,
        updatedAt: now
      })

      return {
        config: defaultConfig,
        updatedAt: now.getTime()
      }
    }

    const session = result[0]
    if (!session) {
      return { config: null, updatedAt: Date.now() }
    }

    const config = JSON.parse(session.config)
    
    return {
      config,
      updatedAt: session.updatedAt.getTime()
    }
  } catch (err: unknown) {
    console.error('Fetch session error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch session' })
  }
})
