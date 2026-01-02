import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

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
  rawExtraction: text('raw_extraction'), // Full JSON from Gemini
  currency: text('currency').notNull().default('AUD'),
  originalTotal: real('original_total'),
  exchangeRate: real('exchange_rate'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  mfbCategory: text('mfb_category'),
  defaultMfbPercent: integer('default_mfb_percent').default(100),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const claims = sqliteTable('claims', {
  id: text('id').primaryKey(),
  financialYear: text('financial_year').notNull(),
  claimDate: text('claim_date').notNull(),
  totalAmount: real('total_amount').notNull(),
  mfbAmount: real('mfb_amount').notNull(),
  mmrAmount: real('mmr_amount').notNull(),
  gstAmount: real('gst_amount').notNull(),
  expenseCount: integer('expense_count').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
})

export const expenseClaims = sqliteTable('expense_claims', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull().references(() => expenses.id),
  claimId: text('claim_id').references(() => claims.id),
  status: text('status').notNull().default('pending'), // pending | claimed | archived
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  claimedAt: integer('claimed_at', { mode: 'timestamp' }),
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

export const authorizedUsers = sqliteTable('authorized_users', {
  email: text('email').primaryKey(),
  name: text('name'),
  pictureUrl: text('picture_url'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const inboxItems = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address'),
  envelopeFrom: text('envelope_from'),
  subject: text('subject'),
  textBody: text('text_body'),
  htmlBody: text('html_body'),
  receivedAt: text('received_at').notNull(),
  status: text('status').notNull().default('pending'), // pending, processing, complete, error, ignored, unauthorized
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  errorMessage: text('error_message'),
  expenseId: text('expense_id').references(() => expenses.id),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const inboxAttachments = sqliteTable('inbox_attachments', {
  id: text('id').primaryKey(),
  inboxItemId: text('inbox_item_id').notNull().references(() => inboxItems.id),
  filename: text('filename'),
  mimeType: text('mime_type').notNull(),
  storageKey: text('storage_key').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})
