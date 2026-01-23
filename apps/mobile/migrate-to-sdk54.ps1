# PowerShell script for Windows - SDK 54 Migration
Write-Host "🚀 Migrating to Expo SDK 54..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile directory
Set-Location $PSScriptRoot

Write-Host "📦 Step 1: Cleaning old dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Recurse -Force node_modules }
if (Test-Path "package-lock.json") { Remove-Item -Force package-lock.json }
if (Test-Path "yarn.lock") { Remove-Item -Force yarn.lock }
Write-Host "✓ Cleaned" -ForegroundColor Green
Write-Host ""

Write-Host "📥 Step 2: Installing SDK 54 packages..." -ForegroundColor Yellow
npm install
Write-Host "✓ Installed" -ForegroundColor Green
Write-Host ""

Write-Host "🧹 Step 3: Clearing Metro bundler cache..." -ForegroundColor Yellow
if (Test-Path ".expo") { Remove-Item -Recurse -Force .expo }
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }
Write-Host "✓ Cleared" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Migration to SDK 54 complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT - SDK 54 Notes:" -ForegroundColor Yellow
Write-Host "  - New Architecture is ENABLED (required in Expo Go)" -ForegroundColor Yellow
Write-Host "  - Strict type checking for boolean props" -ForegroundColor Yellow
Write-Host "  - All boolean fixes are already applied" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run: npx expo start --clear"
Write-Host "  2. Test your app thoroughly"
Write-Host "  3. All boolean props should work correctly"
Write-Host ""
Write-Host "If you encounter issues:"
Write-Host "  - Check FIX_HOSTFUNCTION_ERROR.md"
Write-Host "  - Verify all boolean props use explicit values"
Write-Host "  - Try: npx expo install --fix"



































