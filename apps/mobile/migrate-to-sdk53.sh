#!/bin/bash

echo "🚀 Migrating to Expo SDK 53..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to mobile directory
cd "$(dirname "$0")"

echo "${YELLOW}📦 Step 1: Cleaning old dependencies...${NC}"
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
echo "${GREEN}✓ Cleaned${NC}"
echo ""

echo "${YELLOW}📥 Step 2: Installing SDK 53 packages...${NC}"
npm install
echo "${GREEN}✓ Installed${NC}"
echo ""

echo "${YELLOW}🧹 Step 3: Clearing Metro bundler cache...${NC}"
rm -rf .expo
rm -rf node_modules/.cache
echo "${GREEN}✓ Cleared${NC}"
echo ""

echo "${GREEN}✅ Migration complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run: npx expo start --clear"
echo "  2. Test your app thoroughly"
echo "  3. Check SDK53_MIGRATION.md for details"
echo ""
echo "If you encounter issues:"
echo "  - Try: npx expo install --fix"
echo "  - Or see troubleshooting in SDK53_MIGRATION.md"


































