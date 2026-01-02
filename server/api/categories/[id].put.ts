import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { categories } from '~~/server/db/schema'
import { broadcastCategoriesChanged, broadcastClaimsChanged } from '~~/server/utils/broadcast'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return

  const body = await readBody(event)

  // Check if P2C mapping is changing
  const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1).get()
  const mappingChanged =
    existing &&
    (existing.mfbCategory !== body.mfbCategory ||
     existing.defaultMfbPercent !== body.defaultMfbPercent)

  await db.update(categories)
    .set({
      name: body.name,
      description: body.description,
      color: body.color,
      mfbCategory: body.mfbCategory,
      defaultMfbPercent: body.defaultMfbPercent,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))

  // Notify other devices
  const session = await requireUserSession(event)
  const email = (session.user as any).email
  if (email) {
    broadcastCategoriesChanged(email)
    // If P2C mapping changed, also refresh claims page
    if (mappingChanged) {
      broadcastClaimsChanged(email)
    }
  }

  return { success: true }
})
