# Download APK Script
# This script checks build status and downloads the latest APK

Write-Host "Checking APK build status..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if EAS CLI is installed
if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "EAS CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g eas-cli
}

# Check if logged in to Expo
Write-Host "Checking Expo login status..." -ForegroundColor Cyan
$loginStatus = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please log in to Expo first:" -ForegroundColor Yellow
    Write-Host "  eas login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Listing recent APK builds..." -ForegroundColor Cyan
Write-Host ""

# List recent builds
eas build:list --platform android --profile apk --limit 5

Write-Host ""
Write-Host "Downloading latest APK..." -ForegroundColor Green
Write-Host ""

# Create downloads directory if it doesn't exist
$downloadsDir = Join-Path $scriptPath "downloads"
if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir | Out-Null
}

# Download latest APK
$outputPath = Join-Path $downloadsDir "siteweave-mobile.apk"
eas build:download --platform android --profile apk --latest --output $outputPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "APK downloaded successfully!" -ForegroundColor Green
    Write-Host "Location: $outputPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Yellow
    Write-Host "1. Transfer this APK to an Android device" -ForegroundColor Cyan
    Write-Host "2. Install it by enabling 'Install from unknown sources' in Android settings" -ForegroundColor Cyan
    Write-Host "3. Open the APK file on the device and tap 'Install'" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Download failed or no builds available yet." -ForegroundColor Red
    Write-Host ""
    Write-Host "Check build status at:" -ForegroundColor Yellow
    Write-Host "  https://expo.dev/accounts/abadiech/projects/siteweave-mobile/builds" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or wait for the build to complete and try again." -ForegroundColor Yellow
}
