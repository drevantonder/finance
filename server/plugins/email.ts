import PostalMime from 'postal-mime'
import { eq } from 'drizzle-orm'
import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments, authorizedUsers } from '../db/schema'
import { processInboxItem } from '../utils/inbox'
import { logActivity } from '../utils/logger'

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
    const correlationId = `email-${id}`
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
      
      // Detect Gmail auto-forward (CAF = Content Addressable Forwarding)
      // Pattern: user+caf_=original=domain.com@gmail.com
      const gmailCafMatch = envelopeFrom.match(/^([^+]+)\+caf_=.+@gmail\.com$/)
      const gmailForwarder = gmailCafMatch ? `${gmailCafMatch[1]}@gmail.com` : null

      // Check Cloudflare authentication results from parsed email headers
      // Cloudflare adds Authentication-Results header to the raw email
      let dkimPass = false
      let spfPass = false
      let authDetails = ''

      if (email.headers) {
        for (const header of email.headers) {
          const key = header.key?.toLowerCase() || ''
          const value = header.value?.toLowerCase() || ''
          
          if (key === 'authentication-results') {
            authDetails = header.value || ''
            dkimPass = value.includes('dkim=pass')
            spfPass = value.includes('spf=pass')
          }
          
          if (key === 'received-spf') {
            spfPass = spfPass || value.includes('pass')
          }
        }
      }

      // Only trust headerFrom after authentication passes
      // For Gmail forwards: verify the forwarding Gmail is authorized AND DKIM passes
      const hasPassedAuth = dkimPass || spfPass
      let authResult: { email: string } | undefined = undefined
      let isGmailForward = false

      if (hasPassedAuth) {
        if (gmailForwarder && dkimPass) {
          // Gmail CAF forward - check if the forwarding Gmail is authorized
          const forwarderAuth = await db.select()
            .from(authorizedUsers)
            .where(eq(authorizedUsers.email, gmailForwarder))
            .get()
          
          if (forwarderAuth) {
            isGmailForward = true
            authResult = { email: headerFrom }
          }
        } else {
          // Direct email - check if sender is authorized
          authResult = await db.select()
            .from(authorizedUsers)
            .where(eq(authorizedUsers.email, headerFrom))
            .get()
        }
      }

      const isVerified = !!authResult

      console.log(`[EmailInbox] Email verification:`, {
        envelopeFrom,
        headerFrom,
        dkimPass,
        spfPass,
        hasPassedAuth,
        isGmailForward,
        gmailForwarder,
        authDetails,
        isVerified,
        authorizedEmail: authResult?.email || 'none'
      })
      
      if (!isVerified) {
        const reason = gmailForwarder 
          ? `Gmail forwarder ${gmailForwarder} not authorized`
          : `Sender ${headerFrom} not authorized`
        
        console.warn(`[EmailInbox] Unauthorized: ${reason} (Auth: ${hasPassedAuth})`)
        logActivity({
          type: 'error',
          level: 'warn',
          message: `Unauthorized email: ${reason}`,
          correlationId,
          metadata: { envelopeFrom, headerFrom, gmailForwarder, dkimPass, spfPass, authDetails }
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
      logActivity({
        type: 'error',
        level: 'error',
        message: `Failed to process incoming email: ${err.message}`,
        correlationId,
        metadata: { 
          error: err.stack,
          from: message.from,
          to: message.to,
          headers: Object.fromEntries(message.headers.entries())
        }
      }).catch(logErr => {
        console.error('Failed to log email error:', logErr)
      })
    }
  })
})
