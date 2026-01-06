#!/bin/bash
# Setup Turborepo remote caching for Vercel Turbo

set -e

echo "🚀 Setting up Turborepo Remote Cache"
echo "====================================="
echo ""

# Step 1: Login to Vercel Turbo
echo "1️⃣  Logging into Vercel Turbo..."
echo "   (Opens browser for authentication)"
npx turbo login

# Step 2: Link the project
echo ""
echo "2️⃣  Linking project to remote cache..."
npx turbo link

# Step 3: Instructions for GitHub
echo ""
echo "3️⃣  GitHub Secrets Setup"
echo "   ====================="
echo ""
echo "   Run the following to add TURBO_TOKEN to GitHub secrets:"
echo ""
echo "   gh secret set TURBO_TOKEN --body \"\$(cat ~/.config/turbo/turbo.token)\""
echo ""
echo "   Or visit: https://github.com/drevantonder/finance/settings/secrets/actions"
echo ""
echo "   Note: TURBO_TEAM is optional (for organization caching)"
echo ""

echo "✅ Setup complete!"
echo ""
echo "To verify remote cache is working:"
echo "  pnpm turbo run build  # First run (pushes to cache)"
echo "  rm -rf .output && pnpm turbo run build  # Second run (uses cache)"
