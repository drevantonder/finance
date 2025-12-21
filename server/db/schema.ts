import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().default('default'),
  config: text('config').notNull(), // JSON string of SessionConfig
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
