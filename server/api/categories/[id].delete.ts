import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return

  await db.delete(categories).where(eq(categories.id, id))

  // Notify other devices
  const { user } = await requireUserSession(event)
  if (user?.email) {
    await broadcastCategoriesChanged(user.email)
  }

  return { success: true }
})
