import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return

  const body = await readBody(event)
  
  await db.update(categories)
    .set({
      name: body.name,
      description: body.description,
      color: body.color,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))

  // Notify other devices
  const session = await requireUserSession(event)
  const email = (session.user as any).email
  if (email) {
    broadcastCategoriesChanged(email)
  }

  return { success: true }
})
