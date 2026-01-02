#!/bin/bash

echo "📥 Pulling production data to local dev database..."

# Get database ID from environment
DB_ID=$(grep NUXT_HUB_CLOUDFLARE_DATABASE_ID .env | cut -d '=' -f2)
DB_NAME="finance-db"

# Backup local dev database
mkdir -p backups
backup_file="backups/dev-backup-$(date +%Y%m%d-%H%M%S).sql"
npx wrangler d1 export "$DB_NAME" --local --output "$backup_file"
echo "📦 Local backup saved to $backup_file"

# Pull from production
echo "📥 Fetching production data..."
npx wrangler d1 export "$DB_NAME" --remote --output prod-dump.sql

# Replace local database using system sqlite3
echo "🔄 Replacing local database..."
# Create directory if it doesn't exist
mkdir -p .data/db
# Backup current db
cp .data/db/sqlite.db "$backup_file" 2>/dev/null || true
# Import new data
rm -f .data/db/sqlite.db
sqlite3 .data/db/sqlite.db < prod-dump.sql

# Ensure NuxtHub's local migration tracking table exists
# Production uses `d1_migrations`, NuxtHub dev uses `_hub_migrations`.
# If `_hub_migrations` is missing, NuxtHub will try to re-run migrations.
sqlite3 .data/db/sqlite.db <<'SQL'
CREATE TABLE IF NOT EXISTS _hub_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
DELETE FROM _hub_migrations;

-- If the DB came from production, copy applied migrations from d1_migrations
-- Strip .sql suffix since NuxtHub expects names without extension
INSERT INTO _hub_migrations (name, applied_at)
SELECT REPLACE(name, '.sql', ''), applied_at FROM d1_migrations ORDER BY id;
SQL

# Keep NuxtHub's local migrations folder in sync with repo migrations
mkdir -p .data/db/migrations
cp server/db/migrations/*.sql .data/db/migrations/

echo "✅ Local dev database synced with production"
echo "💾 Local backup file: $backup_file"

# Cleanup
rm prod-dump.sql
