import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { authorizedUsers } from '../db/schema'

export async function isAuthorizedEmail(email: string): Promise<boolean> {
  const user = await db.select()
    .from(authorizedUsers)
    .where(eq(authorizedUsers.email, email.toLowerCase()))
    .get()
  return !!user
}

export async function updateLastLogin(email: string, name?: string, picture?: string): Promise<void> {
  await db.update(authorizedUsers)
    .set({
      name: name ?? undefined,
      pictureUrl: picture ?? undefined,
      lastLoginAt: new Date().toISOString()
    })
    .where(eq(authorizedUsers.email, email.toLowerCase()))
}
