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

export function notifyUser(userId: string, eventType: string, data?: unknown) {
  const message = JSON.stringify(data ?? { timestamp: Date.now() })
  
  for (const [clientId, client] of clients) {
    if (client.userId === userId) {
      // Fire-and-forget push to avoid blocking request context
      // Catch errors silently as they usually mean the stream is closed or cross-context
      client.stream.push({ 
        event: eventType, 
        data: message
      }).catch((err) => {
        // Silently remove stale clients if they error
        clients.delete(clientId)
      })
    }
  }
}
