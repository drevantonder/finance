import PostalMime from 'postal-mime'
import { eq, sql } from 'drizzle-orm'
import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments, authorizedUsers } from '../db/schema'
import { processInboxItem } from '../utils/inbox'

export default defineNitroPlugin((nitroApp) => {
  // @ts-ignore - Nitro hook for Cloudflare Email Routing
  nitroApp.hooks.hook('cloudflare:email', async ({ message, env, context }) => {
    const id = crypto.randomUUID()
    const receivedAt = new Date().toISOString()
    
    try {
      // 1. Parse Email
      const rawResponse = new Response(message.raw)
      const rawArrayBuffer = await rawResponse.arrayBuffer()
      const parser = new PostalMime()
      const email = await parser.parse(rawArrayBuffer)

      // 2. Verify Sender & Authentication (DKIM/SPF)
      const envelopeFrom = message.from.toLowerCase()
      const headerFrom = (email.from?.address || '').toLowerCase()
      
      // Check Cloudflare authentication results (DKIM/SPF)
      const authResults = message.headers.get('Authentication-Results') || ''
      const hasPassedAuth = authResults.includes('dkim=pass') || authResults.includes('spf=pass')

      // Find authorized user
      const authResult = await db.select()
        .from(authorizedUsers)
        .where(
          sql`${authorizedUsers.email} = ${envelopeFrom} OR (${authorizedUsers.email} = ${headerFrom} AND ${hasPassedAuth})`
        )
        .get()

      const isVerified = !!authResult
      
      if (!isVerified) {
        console.warn(`[EmailInbox] Unauthorized email from ${headerFrom} (Envelope: ${envelopeFrom}, Auth: ${hasPassedAuth})`)
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
          sizeBytes: attachment.content.byteLength
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

    } catch (err) {
      console.error(`[EmailInbox] Failed to process incoming email:`, err)
    }
  })
})
