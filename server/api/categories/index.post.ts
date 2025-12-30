import { db } from 'hub:db'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = crypto.randomUUID()
  const now = new Date()

  const newCategory = {
    id,
    name: body.name,
    description: body.description,
    color: body.color || '#9ca3af',
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(categories).values(newCategory)

  // Notify other devices
  const session = await requireUserSession(event)
  const email = (session.user as any).email
  if (email) {
    broadcastCategoriesChanged(email)
  }

  return newCategory
})
