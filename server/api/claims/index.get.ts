import { db } from 'hub:db'
import { claims } from '~~/server/db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  return await db.select()
    .from(claims)
    .orderBy(desc(claims.claimDate))
    .all()
})
