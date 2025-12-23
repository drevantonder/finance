#!/bin/bash

set -e

# Sync blobs: production → local dev (R2)

BUCKET_NAME="finance-receipts"
LOCAL_DIR=".data/blob/receipts"

echo "📥 Pulling blobs from production R2 bucket..."

# Create local blob directory if it doesn't exist
mkdir -p "$LOCAL_DIR"

# Get list of remote objects and download each
echo "📋 Fetching remote object list..."
count=0
for key in $(npx wrangler r2 object list "$BUCKET_NAME" --prefix receipts/ --remote | awk '{print $1}'); do
  # remove 'receipts/' prefix for local filename
  filename=$(basename "$key")
  
  if [ -n "$filename" ] && [ "$filename" != "receipts" ]; then
    echo "  📥 Downloading $filename..."
    npx wrangler r2 object get "$BUCKET_NAME/$key" --file="$LOCAL_DIR/$filename" --remote
    count=$((count + 1))
  fi
done

echo "✅ Downloaded $count blobs from production R2 bucket"
