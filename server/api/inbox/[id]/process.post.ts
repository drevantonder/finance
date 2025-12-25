import { processInboxItem } from '~~/server/utils/inbox'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const result = await processInboxItem(id)

  // Notify other devices
  const { user } = await requireUserSession(event)
  if (user?.email) {
    await broadcastInboxChanged(user.email)
  }

  return result
})
