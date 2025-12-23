import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return

  await db.delete(categories).where(eq(categories.id, id))
  return { success: true }
})
