import { upsertSession, setNoStore, isPlainObject } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  setNoStore(event)
  
  // Validate request body structure
  const body = await readValidatedBody(event, (b: unknown) => {
    if (!isPlainObject(b)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
    }
    return b
  })

  const { config } = body
  
  try {
    const updatedAt = await upsertSession(config)
    return { success: true, updatedAt }
  } catch (err: unknown) {
    console.error('Migration error:', err)
    throw err
  }
})
