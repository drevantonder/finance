import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai'

export interface ReceiptExtraction {
  total: number
  tax: number
  merchant: string
  date: string
  items: Array<{
    name: string
    qty: number
    price: number
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
          price: {
            type: Type.NUMBER,
            description: "The total price for this line item",
          },
        },
        required: ["name", "price"],
      },
    },
  },
  required: ["total", "merchant", "date"],
}

export async function extractReceiptData(imageBase64: string): Promise<ReceiptExtraction> {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey
  
  if (!apiKey) {
    throw new Error('NUXT_GEMINI_API_KEY is not set in environment')
  }

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `Extract the following details from this receipt image.
- total: The final total amount paid
- tax: The GST/tax amount (use 0 if not visible)
- merchant: The store or seller name
- date: The receipt date in YYYY-MM-DD format
- items: List of purchased items with name, quantity, and price

If a field is unclear, provide your best estimate. For items without explicit quantities, use 1.`

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: imageBase64,
              mimeType: "image/jpeg",
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MEDIUM, // Balance speed and accuracy
      },
    },
  })

  const text = response.text
  
  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  try {
    return JSON.parse(text) as ReceiptExtraction
  } catch (e) {
    console.error('Failed to parse Gemini response:', text)
    throw new Error('Failed to parse receipt data from AI response')
  }
}
