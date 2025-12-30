import PostalMime from 'postal-mime'
import { eq } from 'drizzle-orm'
import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments, authorizedUsers, logs } from '../db/schema'
import { processInboxItem } from '../utils/inbox'

interface CloudflareEmailMessage {
  from: string
  to: string
  headers: Headers
  raw: ReadableStream
  rawSize: number
}

interface CloudflareEmailContext {
  waitUntil: (promise: Promise<any>) => void
}

export default defineNitroPlugin((nitroApp) => {
  // @ts-ignore - Nitro hook for Cloudflare Email Routing
  nitroApp.hooks.hook('cloudflare:email', async ({ message, env, context }: { message: CloudflareEmailMessage, env: any, context: CloudflareEmailContext }) => {
    const id = crypto.randomUUID()
    const receivedAt = new Date().toISOString()
    
    try {
      // 1. Parse Email
      // Use Response API to efficiently convert ReadableStream to ArrayBuffer
      const rawArrayBuffer = await new Response(message.raw).arrayBuffer()
      const parser = new PostalMime()
      const email = await parser.parse(rawArrayBuffer)

      // 2. Verify Sender & Authentication (DKIM/SPF)
      const envelopeFrom = message.from.toLowerCase()
      const headerFrom = (email.from?.address || '').toLowerCase()
      
      // Log all headers to find auth information
      const allHeaders = Object.fromEntries(message.headers.entries())
      console.log(`[EmailInbox] All headers:`, JSON.stringify(allHeaders, null, 2))

      // Check Cloudflare authentication results (DKIM/SPF)
      // Use word boundaries to prevent substring attacks
      const authResults = message.headers.get('Authentication-Results') || ''
      const arcAuthResults = message.headers.get('ARC-Authentication-Results') || ''
      const allAuthResults = `${authResults} ${arcAuthResults}`

      const dkimPass = /\bdkim=pass\b/i.test(allAuthResults)
      const spfPass = /\bspf=pass\b/i.test(allAuthResults)
      
      // Require DKIM pass OR (SPF pass with envelope-header alignment)
      // This prevents envelope spoofing attacks
      const hasPassedAuth = dkimPass || (spfPass && envelopeFrom === headerFrom)

      // Only trust headerFrom after authentication passes
      // Never trust unauthenticated envelope addresses
      const authResult = hasPassedAuth 
        ? await db.select()
            .from(authorizedUsers)
            .where(eq(authorizedUsers.email, headerFrom))
            .get()
        : null

      const isVerified = !!authResult
      
      if (!isVerified) {
        console.warn(`[EmailInbox] Unauthorized email from ${headerFrom} (Envelope: ${envelopeFrom}, Auth: ${hasPassedAuth})`)
        await db.insert(logs).values({
          id: crypto.randomUUID(),
          level: 'warn',
          message: `Unauthorized email from ${headerFrom}`,
          source: 'email',
          details: JSON.stringify({ envelopeFrom, headerFrom, hasPassedAuth, dkimPass, spfPass }),
          createdAt: new Date()
        }).catch(() => {})
      }

      // 3. Store Attachments in R2
      const attachmentRefs = []
      for (const attachment of (email.attachments || [])) {
        const attachmentId = crypto.randomUUID()
        const storageKey = `inbox/${id}/${attachment.filename || 'unnamed'}`
        
        await blob.put(storageKey, attachment.content, {
          contentType: attachment.mimeType,
          addPath: true,
          customMetadata: {
            inboxItemId: id,
            filename: attachment.filename || 'unnamed'
          }
        })
        
        attachmentRefs.push({
          id: attachmentId,
          inboxItemId: id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          storageKey,
          sizeBytes: typeof attachment.content === 'string' ? attachment.content.length : attachment.content.byteLength
        })
      }

      // 4. Store Email Metadata in D1
      await db.insert(inboxItems).values({
        id,
        fromAddress: email.from?.address || message.from,
        toAddress: message.to,
        envelopeFrom,
        subject: email.subject || '(no subject)',
        textBody: email.text || null,
        htmlBody: email.html || null,
        receivedAt,
        status: isVerified ? 'pending' : 'unauthorized',
        verified: isVerified,
        createdAt: new Date().toISOString()
      })

      for (const ref of attachmentRefs) {
        await db.insert(inboxAttachments).values(ref)
      }

      console.log(`[EmailInbox] Stored email ${id} from ${envelopeFrom} (Verified: ${isVerified})`)

      // 5. Auto-Process if verified
      if (isVerified) {
        context.waitUntil(processInboxItem(id))
      }

    } catch (err: any) {
      console.error(`[EmailInbox] Failed to process incoming email:`, err)
      // Log failure to database for visibility in UI
      try {
        await db.insert(logs).values({
          id: crypto.randomUUID(),
          level: 'error',
          message: `Failed to process incoming email: ${err.message}`,
          source: 'email',
          details: JSON.stringify({ 
            error: err.stack,
            from: message.from,
            to: message.to,
            headers: Object.fromEntries(message.headers.entries())
          }),
          createdAt: new Date()
        })
      } catch (logErr) {
        console.error('Failed to log email error:', logErr)
      }
    }
  })
})
