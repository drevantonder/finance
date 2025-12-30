import { processInboxItem } from '~~/server/utils/inbox'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const result = await processInboxItem(id)

  // Notify other devices
  const session = await requireUserSession(event)
  const email = (session.user as any).email
  if (email) {
    broadcastInboxChanged(email)
  }

  return result
})
