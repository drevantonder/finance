import { db } from 'hub:db'
import { logs } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ip = getRequestIP(event)

  const entry = {
    id: crypto.randomUUID(),
    level: body.level,
    message: body.message,
    source: body.source,
    details: body.details,
    ip: ip || null,
    createdAt: new Date()
  }

  await db.insert(logs).values(entry)
  return entry
})
