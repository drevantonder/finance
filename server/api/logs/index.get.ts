import { db } from 'hub:db'
import { eq, desc } from 'drizzle-orm'
import { logs } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  return await db.select()
    .from(logs)
    .orderBy(desc(logs.createdAt))
    .limit(100)
})
