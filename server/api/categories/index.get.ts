import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  return await db.select().from(categories).orderBy(categories.name)
})
