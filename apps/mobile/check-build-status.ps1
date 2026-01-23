# Check Build Status Script
# This script checks the status of your latest APK build

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
Write-Host "Latest APK builds:" -ForegroundColor Cyan
Write-Host ""

# List recent builds with more details
eas build:list --platform android --profile apk --limit 3 --json | ConvertFrom-Json | ForEach-Object {
    $build = $_
    Write-Host "Build ID: $($build.id)" -ForegroundColor Yellow
    Write-Host "Status: $($build.status)" -ForegroundColor $(if ($build.status -eq "finished") { "Green" } elseif ($build.status -eq "in-progress") { "Cyan" } else { "Red" })
    Write-Host "Created: $($build.createdAt)" -ForegroundColor Gray
    if ($build.artifacts) {
        Write-Host "Download URL: $($build.artifacts.buildUrl)" -ForegroundColor Cyan
    }
    Write-Host ""
}

Write-Host "View all builds at:" -ForegroundColor Yellow
Write-Host "  https://expo.dev/accounts/abadiech/projects/siteweave-mobile/builds" -ForegroundColor Cyan
Write-Host ""

# Check if latest build is finished
$latestBuild = eas build:list --platform android --profile apk --limit 1 --json | ConvertFrom-Json | Select-Object -First 1

if ($latestBuild -and $latestBuild.status -eq "finished") {
    Write-Host "Latest build is complete! You can download it now:" -ForegroundColor Green
    Write-Host "  .\download-apk.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or download directly:" -ForegroundColor Yellow
    Write-Host "  eas build:download --platform android --profile apk --latest" -ForegroundColor Cyan
} elseif ($latestBuild -and $latestBuild.status -eq "in-progress") {
    Write-Host "Build is still in progress. Please wait..." -ForegroundColor Yellow
    Write-Host "You can check the build logs at the URL above." -ForegroundColor Cyan
} elseif ($latestBuild) {
    Write-Host "Latest build status: $($latestBuild.status)" -ForegroundColor Yellow
}
