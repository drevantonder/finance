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

echo "✅ Local dev database synced with production"
echo "💾 Local backup file: $backup_file"

# Cleanup
rm prod-dump.sql
