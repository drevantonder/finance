import { createEventStream } from 'h3'

interface SSEClient {
  stream: ReturnType<typeof createEventStream>
  userId: string
}

const clients = new Map<string, SSEClient>()

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const email = (session.user as any).email
  
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const stream = createEventStream(event)
  const clientId = crypto.randomUUID()
  
  clients.set(clientId, { stream, userId: email })
  
  const heartbeat = setInterval(async () => {
    await stream.push({ event: 'heartbeat', data: '' })
  }, 30_000)
  
  stream.onClosed(async () => {
    clearInterval(heartbeat)
    clients.delete(clientId)
    await stream.close()
  })
  
  return stream.send()
})

export async function notifyUser(userId: string, eventType: string, data?: unknown) {
  const message = JSON.stringify(data ?? { timestamp: Date.now() })
  const promises = []
  
  for (const [, client] of clients) {
    if (client.userId === userId) {
      promises.push(client.stream.push({ 
        event: eventType, 
        data: message
      }))
    }
  }
  
  await Promise.all(promises)
}
