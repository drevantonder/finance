import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().default('default'),
  config: text('config').notNull(), // JSON string of SessionConfig
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  imageKey: text('image_key').notNull(),
  imageHash: text('image_hash'),
  receiptHash: text('receipt_hash'),
  status: text('status').notNull().default('pending'),
  capturedAt: integer('captured_at', { mode: 'timestamp' }).notNull(),
  total: real('total'),
  tax: real('tax'),
  merchant: text('merchant'),
  date: text('date'),
  items: text('items'), // JSON stringified array of line items
  category: text('category'),
  notes: text('notes'),
  rawExtraction: text('raw_extraction'), // Full JSON from Gemini
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
