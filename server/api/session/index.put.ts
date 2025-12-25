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

    // Notify other devices
    const { user } = await requireUserSession(event)
    if (user?.email) {
      await broadcastSessionChanged(user.email)
    }

    return { success: true, updatedAt }
  } catch (err: unknown) {
    console.error('Save session error:', err)
    throw err
  }
})
