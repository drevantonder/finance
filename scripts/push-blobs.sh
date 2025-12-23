#!/bin/bash

set -e

# Sync blobs: local dev → production (R2)

BUCKET_NAME="finance-receipts"
LOCAL_DIR=".data/blob/receipts"

echo "⚠️  WARNING: This will REPLACE your PRODUCTION R2 bucket with local dev blobs!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

if [ ! -d "$LOCAL_DIR" ]; then
  echo "⚠️  No local blobs found in $LOCAL_DIR"
  exit 0
fi

echo "📤 Pushing blobs to production R2 bucket..."

# Upload each file individually
count=0
for file in "$LOCAL_DIR"/*; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    # Only upload valid image files or files we care about, skipping .DS_Store etc
    if [[ "$filename" != ".DS_Store" && "$filename" != *"\$meta.json" ]]; then
       echo "  📤 Uploading $filename..."
       npx wrangler r2 object put "$BUCKET_NAME/receipts/$filename" --file="$file" --remote
       count=$((count + 1))
    fi
  fi
done

echo "✅ Uploaded $count blobs to production R2 bucket"
