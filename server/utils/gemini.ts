import { db } from 'hub:db'
import { categories } from '~~/server/db/schema'

export interface ReceiptExtraction {
  total: number
  tax: number
  currency: string
  merchant: string
  date: string
  items: Array<{
    name: string
    qty: number
    unit: string
    unitPrice: number
    lineTotal: number
    category: string
    taxable: boolean
  }>
}

const responseSchema = {
  type: "object",
  properties: {
    total: {
      type: "number",
      description: "The total amount of the receipt",
    },
    tax: {
      type: "number",
      description: "The tax or GST amount (0 if not shown)",
    },
    currency: {
      type: "string",
      description: "ISO 4217 currency code (e.g. AUD, USD, EUR, GBP). Default to AUD if not specified.",
    },
    merchant: {
      type: "string",
      description: "The name of the shop or seller",
    },
    date: {
      type: "string",
      description: "The date of the receipt in ISO format (YYYY-MM-DD)",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the item",
          },
          qty: {
            type: "number",
            description: "The quantity purchased (default 1)",
          },
          unit: {
            type: "string",
            description: "The measurement unit (ea, kg, L, etc.)",
          },
          unitPrice: {
            type: "number",
            description: "The price per unit/kg/L",
          },
          lineTotal: {
            type: "number",
            description: "The total price for this line item (qty * unitPrice)",
          },
          category: {
            type: "string",
            description: "Category for this specific item (e.g. Groceries, Cleaning, Alcohol)",
          },
          taxable: {
            type: "boolean",
            description: "True if GST/tax was applied to this specific item",
          },
        },
        required: ["name", "lineTotal", "category", "taxable"],
      },
    },
  },
  required: ["total", "merchant", "date", "currency"],
}

export async function extractReceiptData(input: { image?: string, text?: string, mimeType?: string }): Promise<ReceiptExtraction> {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey
  const aiGatewayUrl = config.aiGatewayUrl
  
  if (!apiKey) {
    throw new Error('NUXT_GEMINI_API_KEY is not set in environment')
  }

  // Fetch user-defined categories for context
  const userCategories = await db.select().from(categories).all()
  const categoryContext = userCategories.length > 0 
    ? `You MUST use ONLY one of these categories: ${userCategories.map(c => c.name).join(', ')}, or "Uncategorized" if none fit. DO NOT invent new categories.`
    : `Use "Uncategorized" for all items.`

  const prompt = `Extract receipt details from the provided ${input.image ? 'image' : 'text'}.
- total: Final total amount paid
- tax: GST/tax amount (0 if not visible)
- currency: ISO 4217 currency code (e.g. AUD, USD, EUR, GBP)
- merchant: Store or seller name
- date: Receipt date (YYYY-MM-DD)
- items: List of items with name, qty, unit, unitPrice, lineTotal, category (${categoryContext}), and taxable (boolean).

If a field is unclear, provide your best estimate.`

  const parts: any[] = [{ text: prompt }]
  
  if (input.image) {
    parts.push({
      inlineData: {
        data: input.image,
        mimeType: input.mimeType || "image/jpeg",
      },
    })
  } else if (input.text) {
    parts.push({ text: `DATA TO EXTRACT FROM:\n${input.text}` })
  }

  // Normalize gateway URL (remove trailing slash if present)
  const gatewayBase = aiGatewayUrl?.replace(/\/$/, '')
  
  // Build API URL and headers - use AI Gateway if configured, otherwise direct Google API
  let apiUrl: string
  let requestBody: any
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  
  if (gatewayBase) {
    // Cloudflare AI Gateway uses OpenAI-compatible endpoint
    // Format: {gateway_base}/compat with model "google-ai-studio/gemini-3-flash-preview"
    apiUrl = `${gatewayBase}/compat/v1/chat/completions`
    headers['Authorization'] = `Bearer ${apiKey}`
    
    // Convert to OpenAI chat format
    const messages: any[] = [
      { role: 'user', content: prompt }
    ]
    
    // For images, use vision format
    if (input.image) {
      const imageMime = input.mimeType || 'image/jpeg'
      messages[0].content = [
        { type: 'text', text: prompt },
        { 
          type: 'image_url', 
          image_url: { url: `data:${imageMime};base64,${input.image}` }
        }
      ]
    } else if (input.text) {
      messages[0].content = `${prompt}\n\nDATA TO EXTRACT FROM:\n${input.text}`
    }
    
    requestBody = {
      model: 'google-ai-studio/gemini-3-flash-preview',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }
    
    console.log('Using Cloudflare AI Gateway with Gemini 3 Flash Preview')
  } else {
    // Direct Google API (native format)
    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`
    
    requestBody = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    }
    
    console.log('Using direct Google Gemini API with Gemini 3 Flash Preview')
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    let text: string | undefined
    
    if (gatewayBase) {
      // OpenAI format response
      text = data.choices?.[0]?.message?.content
      console.log('AI Gateway response received, finish reason:', data.choices?.[0]?.finish_reason)
    } else {
      // Google native format response
      text = data.candidates?.[0]?.content?.parts?.[0]?.text
      console.log('Gemini finish reason:', data.candidates?.[0]?.finishReason)
      
      if (data.candidates?.[0]?.finishReason !== 'STOP') {
        console.warn('Gemini response candidates:', JSON.stringify(data.candidates, null, 2))
      }
    }
    
    if (!text) {
      throw new Error(`Empty response from Gemini. Raw response: ${JSON.stringify(data)}`)
    }

    return JSON.parse(text) as ReceiptExtraction
  } catch (e) {
    throw e
  }
}
