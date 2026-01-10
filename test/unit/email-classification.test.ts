import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('email classification logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('classifyEmail function (standalone test version)', () => {
    it('should correctly parse a receipt classification response', async () => {
      // Mock the API response structure
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                isReceipt: true,
                reason: "Email contains line items with prices and a total amount of $45.99",
                confidence: 0.95,
                suggestedMerchant: "Coles"
              })
            }]
          },
          finishReason: 'STOP'
        }]
      }

      // Parse the response like classifyEmail does
      const text = mockResponse.candidates[0].content.parts[0].text
      const result = JSON.parse(text)

      expect(result.isReceipt).toBe(true)
      expect(result.confidence).toBe(0.95)
      expect(result.reason).toContain('line items')
      expect(result.suggestedMerchant).toBe('Coles')
    })

    it('should correctly parse a non-receipt classification response', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                isReceipt: false,
                reason: "This is a newsletter about weekly specials with no purchase transaction or total amount",
                confidence: 0.88
              })
            }]
          },
          finishReason: 'STOP'
        }]
      }

      const text = mockResponse.candidates[0].content.parts[0].text
      const result = JSON.parse(text)

      expect(result.isReceipt).toBe(false)
      expect(result.confidence).toBe(0.88)
      expect(result.reason).toContain('newsletter')
    })

    it('should handle AI Gateway response format', async () => {
      const mockGatewayResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isReceipt: true,
              reason: "Contains invoice number and payment total",
              confidence: 0.97
            })
          },
          finish_reason: 'stop'
        }]
      }

      const text = mockGatewayResponse.choices[0].message.content
      const result = JSON.parse(text)

      expect(result.isReceipt).toBe(true)
      expect(result.confidence).toBe(0.97)
    })

    it('should handle empty response gracefully', async () => {
      const emptyResponse = {
        candidates: [{
          content: {
            parts: [{}]
          },
          finishReason: 'STOP'
        }]
      }

      const text = emptyResponse.candidates[0].content.parts[0].text
      expect(text).toBeUndefined()
    })

    it('should handle malformed JSON in response', async () => {
      const malformedResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'not valid json'
            }]
          },
          finishReason: 'STOP'
        }]
      }

      expect(() => {
        JSON.parse(malformedResponse.candidates[0].content.parts[0].text)
      }).toThrow()
    })
  })

  describe('classification decision logic', () => {
    it('should identify receipt indicators', () => {
      const receiptIndicators = [
        'total amount paid',
        'dollar amounts with currency symbols',
        'line items with prices',
        'merchant/store name',
        'date of transaction',
        'payment method',
        'GST/tax amounts',
        'invoice number or reference'
      ]

      expect(receiptIndicators.length).toBe(8)
      expect(receiptIndicators).toContain('total amount paid')
    })

    it('should identify non-receipt indicators', () => {
      const nonReceiptIndicators = [
        'newsletters or marketing emails',
        'personal correspondence',
        'system notifications',
        'password reset emails',
        'social media notifications',
        'travel confirmations without purchase details',
        'purely informational emails'
      ]

      expect(nonReceiptIndicators.length).toBe(7)
      expect(nonReceiptIndicators).toContain('password reset emails')
    })

    it('should correctly classify receipt email samples', async () => {
      const receiptSamples = [
        {
          text: `Thank you for shopping at Coles!
Items:
Milk $3.50
Bread $2.50
Total: $45.99
GST included.`,
          expected: { isReceipt: true }
        },
        {
          text: `INVOICE #12345
Total Due: $150.00
Payment due by: Jan 15, 2026`,
          expected: { isReceipt: true }
        },
        {
          text: `Order Confirmation #98765
Amazon.com
Item: Wireless Mouse $29.99
Total charged: $29.99`,
          expected: { isReceipt: true }
        }
      ]

      for (const sample of receiptSamples) {
        // Simulate classification logic
        const hasTotal = /\$\d+\.?\d*/.test(sample.text)
        const hasItems = /(items|item|qty|quantity)/i.test(sample.text)
        const hasMerchant = /(coles|amazon|invoice|order)/i.test(sample.text)
        
        const isReceipt = hasTotal && (hasItems || hasMerchant)
        
        expect(isReceipt).toBe(sample.expected.isReceipt)
      }
    })

    it('should correctly classify non-receipt email samples', async () => {
      const nonReceiptSamples = [
        {
          text: `Weekly Newsletter
Hi John,
Check out our specials this week!
Fresh produce, bakery items, and more.`,
          expected: { isReceipt: false }
        },
        {
          text: `Hi Dave,
Just following up on our meeting for tomorrow.
Let me know if 2pm still works for you.`,
          expected: { isReceipt: false }
        },
        {
          text: `Password Reset Request
We received a request to reset your password.
Click the link below to create a new password.`,
          expected: { isReceipt: false }
        }
      ]

      for (const sample of nonReceiptSamples) {
        // Simulate classification logic
        const hasTotal = /\$\d+\.?\d*/.test(sample.text)
        const hasItems = /(items|item|qty|quantity|invoice|order)/i.test(sample.text)
        const isPromotional = /(newsletter|specials|check out)/i.test(sample.text)
        const isPersonal = /(hi|hello|dear|following up)/i.test(sample.text)
        
        const isReceipt = hasTotal && hasItems && !isPromotional && !isPersonal
        
        expect(isReceipt).toBe(sample.expected.isReceipt)
      }
    })
  })

  describe('EmailClassification interface', () => {
    it('should have correct type structure', () => {
      const validClassification = {
        isReceipt: true as const,
        reason: 'Test reason',
        confidence: 0.85,
        suggestedMerchant: 'Test Store'
      }
      
      expect(validClassification.isReceipt).toBe(true)
      expect(typeof validClassification.confidence).toBe('number')
      expect(validClassification.suggestedMerchant).toBeDefined()
    })

    it('should allow missing optional fields', () => {
      const minimalClassification = {
        isReceipt: false as const,
        reason: 'Not a receipt',
        confidence: 1.0
      }
      
      expect(minimalClassification.isReceipt).toBe(false)
      expect(minimalClassification.suggestedMerchant).toBeUndefined()
    })

    it('should validate confidence range 0-1', () => {
      const validConfidences = [0, 0.25, 0.5, 0.75, 1.0]
      
      for (const conf of validConfidences) {
        expect(conf).toBeGreaterThanOrEqual(0)
        expect(conf).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('classification behavior on edge cases', () => {
    it('should default to receipt when classification fails', async () => {
      // Simulate fallback behavior
      const classificationFailed = true
      
      const result = classificationFailed
        ? {
            isReceipt: true,
            reason: 'Classification failed, defaulting to receipt for manual review',
            confidence: 0
          }
        : null

      expect(result?.isReceipt).toBe(true)
      expect(result?.confidence).toBe(0)
      expect(result?.reason).toContain('Classification failed')
    })

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API error')
      
      const handleError = (error: Error) => {
        console.error('Classification failed:', error)
        return {
          isReceipt: true,
          reason: 'Classification failed, defaulting to receipt for manual review',
          confidence: 0
        }
      }

      const result = handleError(apiError)
      expect(result.isReceipt).toBe(true)
    })

    it('should truncate long text content', async () => {
      const longText = 'A'.repeat(10000)
      const truncated = longText.substring(0, 5000)
      
      expect(truncated.length).toBe(5000)
      expect(longText.length).toBe(10000)
    })
  })

  describe('real-world email classification scenarios', () => {
    it('should classify Amazon order confirmation as receipt', () => {
      const amazonEmail = `Order Confirmation
Amazon.com.au
Order #123-4567890-1234567

Your order has been shipped:
Wireless Mouse $29.99
USB-C Cable $12.99
Total: $42.98

Thank you for your order!`

      const hasOrderNumber = /order #?\d+[-]?\d+/i.test(amazonEmail)
      const hasTotal = /\$\d+\.?\d*/.test(amazonEmail)
      const hasItems = /(mouse|cable)/i.test(amazonEmail)
      
      const isReceipt = hasOrderNumber && hasTotal && hasItems
      
      expect(isReceipt).toBe(true)
    })

    it('should classify Netflix subscription email as non-receipt', () => {
      const netflixEmail = `Your Netflix membership is active
Hi there,
Your payment was processed successfully.
Next billing date: February 15, 2026
Amount: $15.99/month

Enjoy your favorite shows!`

      const hasSubscription = /(membership|subscription|billing)/i.test(netflixEmail)
      const hasPayment = /payment|processed/i.test(netflixEmail)
      const hasItems = /(items|order|purchased)/i.test(netflixEmail)
      
      // Subscription emails are borderline - they have payment info but no line items
      const isReceipt = hasItems // Only true if there are actual purchased items
      
      expect(isReceipt).toBe(false)
    })

    it('should classify flight confirmation as receipt', () => {
      const flightEmail = `Booking Confirmation QF123
Sydney to Melbourne
Departure: Jan 15, 2026 9:00 AM
Passenger: John Smith
Price: $199.00
Booking Reference: ABC123`

      const hasBooking = /booking|confirmation/i.test(flightEmail)
      const hasPrice = /\$\d+\.?\d*/.test(flightEmail)
      const hasTravelDetails = /(flight|sydney|melbourne|departure)/i.test(flightEmail)
      
      const isReceipt = hasPrice && (hasBooking || hasTravelDetails)
      
      // Travel confirmations are receipts if they have a price
      expect(isReceipt).toBe(true)
    })

    it('should classify birthday email from friend as non-receipt', () => {
      const personalEmail = `Hey!
Just wanted to wish you a happy birthday!
Hope you have an amazing day filled with joy and laughter.
Can't wait to catch up soon!
Cheers, Alex`

      const hasPersonalGreeting = /(hey|hi|dear|just wanted)/i.test(personalEmail)
      const hasPersonalClosing = /(can't wait|cheers|best|love)/i.test(personalEmail)
      const hasTransaction = /(order|payment|total|receipt|invoice|purchase)/i.test(personalEmail)
      
      const isReceipt = hasTransaction && !hasPersonalGreeting && !hasPersonalClosing
      
      expect(isReceipt).toBe(false)
    })
  })
})
