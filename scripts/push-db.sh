#!/bin/bash

echo "⚠️  WARNING: This will REPLACE your PRODUCTION database with local dev data!"
echo "A backup will be saved to production-backup-$(date +%Y%m%d-%H%M%S).sql"
read -p "Are you sure? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

# Get database ID from environment
DB_ID=$(grep NUXT_HUB_CLOUDFLARE_DATABASE_ID .env | cut -d '=' -f2)
DB_NAME="finance-db"

# Backup production
mkdir -p backups
backup_file="backups/production-backup-$(date +%Y%m%d-%H%M%S).sql"
echo "📦 Backing up production..."
npx wrangler d1 export "$DB_NAME" --remote --output "$backup_file"
echo "✅ Backup saved to $backup_file"

# Export local dev data using system sqlite3
echo "📤 Exporting local dev data..."

# 1. Start with foreign keys disabled to allow dropping tables in any order
echo "PRAGMA foreign_keys=OFF;" > dev-dump.sql

# 2. Generate DROP TABLE statements for existing tables
# Do NOT drop `_hub_migrations` into prod; it's a NuxtHub-local dev table.
sqlite3 .data/db/sqlite.db "SELECT 'DROP TABLE IF EXISTS \"' || name || '\";' FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_hub_migrations';" >> dev-dump.sql

# 3. Append the schema and data (filtering out transactions + NuxtHub-only table)
sqlite3 .data/db/sqlite.db .dump \
  | sed '/^BEGIN TRANSACTION;$/d' \
  | sed '/^COMMIT;$/d' \
  | sed '/_hub_migrations/d' \
  >> dev-dump.sql

# Import to production
echo "📥 Pushing to production..."
npx wrangler d1 execute "$DB_NAME" --file=dev-dump.sql --remote

# Sync migration tracking: local _hub_migrations → prod d1_migrations (with .sql suffix)
echo "🔄 Syncing migration tracking..."
sqlite3 .data/db/sqlite.db "SELECT name FROM _hub_migrations ORDER BY id;" | while read name; do
  # Add .sql suffix if not present
  [[ "$name" != *.sql ]] && name="${name}.sql"
  npx wrangler d1 execute "$DB_NAME" --remote --command \
    "INSERT OR IGNORE INTO d1_migrations (name, applied_at) VALUES ('$name', datetime('now'));"
done

# Cleanup
echo "🧹 Cleaning up..."
rm dev-dump.sql
echo "✅ Production database synced with dev data"
echo "💾 Backup file: $backup_file"
