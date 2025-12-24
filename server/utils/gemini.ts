import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai'
import { db } from 'hub:db'
import { categories } from '~~/server/db/schema'

export interface ReceiptExtraction {
  total: number
  tax: number
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
  type: Type.OBJECT,
  properties: {
    total: {
      type: Type.NUMBER,
      description: "The total amount of the receipt",
    },
    tax: {
      type: Type.NUMBER,
      description: "The tax or GST amount (0 if not shown)",
    },
    merchant: {
      type: Type.STRING,
      description: "The name of the shop or seller",
    },
    date: {
      type: Type.STRING,
      description: "The date of the receipt in ISO format (YYYY-MM-DD)",
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the item",
          },
          qty: {
            type: Type.NUMBER,
            description: "The quantity purchased (default 1)",
          },
          unit: {
            type: Type.STRING,
            description: "The measurement unit (ea, kg, L, etc.)",
          },
          unitPrice: {
            type: Type.NUMBER,
            description: "The price per unit/kg/L",
          },
          lineTotal: {
            type: Type.NUMBER,
            description: "The total price for this line item (qty * unitPrice)",
          },
          category: {
            type: Type.STRING,
            description: "Category for this specific item (e.g. Groceries, Cleaning, Alcohol)",
          },
          taxable: {
            type: Type.BOOLEAN,
            description: "True if GST/tax was applied to this specific item",
          },
        },
        required: ["name", "lineTotal", "category", "taxable"],
      },
    },
  },
  required: ["total", "merchant", "date"],
}

export async function extractReceiptData(input: { image?: string, text?: string }): Promise<ReceiptExtraction> {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey
  
  if (!apiKey) {
    throw new Error('NUXT_GEMINI_API_KEY is not set in environment')
  }

  // Fetch user-defined categories for context
  const userCategories = await db.select().from(categories).all()
  const categoryContext = userCategories.length > 0 
    ? `You MUST use ONLY one of these categories: ${userCategories.map(c => c.name).join(', ')}, or "Uncategorized" if none fit. DO NOT invent new categories.`
    : `Use "Uncategorized" for all items.`

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `Extract receipt details from the provided ${input.image ? 'image' : 'text'}.
- total: Final total amount paid
- tax: GST/tax amount (0 if not visible)
- merchant: Store or seller name
- date: Receipt date (YYYY-MM-DD)
- items: List of items with name, qty, unit, unitPrice, lineTotal, category (${categoryContext}), and taxable (boolean).

If a field is unclear, provide your best estimate.`

  const parts: any[] = [{ text: prompt }]
  
  if (input.image) {
    parts.push({
      inlineData: {
        data: input.image,
        mimeType: "image/jpeg",
      },
    })
  } else if (input.text) {
    parts.push({ text: `DATA TO EXTRACT FROM:\n${input.text}` })
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  })


  // Improved logging for debugging
  console.log('Gemini finish reason:', response.candidates?.[0]?.finishReason)
  
  if (response.candidates?.[0]?.finishReason !== 'STOP') {
    console.warn('Gemini response candidates:', JSON.stringify(response.candidates, null, 2))
  }

  const text = response.text
  
  if (!text) {
    throw new Error(`Empty response from Gemini. Finish reason: ${response.candidates?.[0]?.finishReason}`)
  }

  try {
    return JSON.parse(text) as ReceiptExtraction
  } catch (e) {
    console.error('Failed to parse Gemini response:', text)
    throw new Error('Failed to parse receipt data from AI response')
  }
}
