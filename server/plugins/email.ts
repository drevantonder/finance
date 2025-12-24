import PostalMime from 'postal-mime'
import { eq } from 'drizzle-orm'
import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments, authorizedUsers } from '../db/schema'

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

      // 2. Verify Sender
      const envelopeFrom = message.from.toLowerCase()
      
      const authResult = await db.select()
        .from(authorizedUsers)
        .where(eq(authorizedUsers.email, envelopeFrom))
        .get()

      const isVerified = !!authResult
      
      // 3. Store Attachments in R2
      const attachmentRefs = []
      for (const attachment of (email.attachments || [])) {
        const attachmentId = crypto.randomUUID()
        const storageKey = `inbox/${id}/${attachment.filename || 'unnamed'}`
        
        await blob.put(storageKey, attachment.content, {
          contentType: attachment.mimeType,
          addPath: true, // Required for some drivers
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
        createdAt: new Date()
      })

      for (const ref of attachmentRefs) {
        await db.insert(inboxAttachments).values(ref)
      }

      console.log(`[EmailInbox] Stored email ${id} from ${envelopeFrom} (Verified: ${isVerified})`)

      // 5. Auto-Process if verified
      if (isVerified) {
        // We trigger an internal API call or call the internal utility
        // For reliability, we'll let the next worker turn handle the heavy AI processing
        context.waitUntil(processInboxItem(id))
      }

    } catch (err) {
      console.error(`[EmailInbox] Failed to process incoming email:`, err)
    }
  })
})

/**
 * Background processor for incoming inbox items
 * Uses existing Gemini extraction logic
 */
async function processInboxItem(id: string) {
  try {
    // Trigger internal processing API - using fetch ensures standard auth/context
    // We use a secret or internal header to bypass regular OAuth for this system call
    await $fetch(`/api/inbox/${id}/process`, {
      method: 'POST',
      headers: {
        'x-internal-trigger': 'true'
      }
    })
  } catch (err) {
    console.error(`[EmailInbox] Auto-processing failed for ${id}:`, err)
  }
}
