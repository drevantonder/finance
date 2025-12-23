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
  schemaVersion: integer('schema_version').notNull().default(1),
  status: text('status').notNull().default('pending'),
  capturedAt: integer('captured_at', { mode: 'timestamp' }).notNull(),
  total: real('total'),
  tax: real('tax'),
  merchant: text('merchant'),
  date: text('date'),
  items: text('items'), // JSON stringified array of line items
  category: text('category'), // Receipt-level category (fallback)
  notes: text('notes'),
  rawExtraction: text('raw_extraction'), // Full JSON from Gemini
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  level: text('level').notNull(), // 'info', 'success', 'warn', 'error'
  message: text('message').notNull(),
  details: text('details'), // JSON string for extra context
  source: text('source').notNull(), // 'expenses', 'sync', 'auth', 'system'
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
