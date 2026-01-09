# Build APK for Direct Distribution
# This script builds an Android APK that can be distributed directly (not through Play Store)

Write-Host "Building Android APK for direct distribution..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Note: Dependencies will be installed on Expo's servers during build
# Local node_modules are not required for EAS builds, but helpful for config validation
Write-Host "Note: EAS builds install dependencies on Expo's servers." -ForegroundColor Cyan
Write-Host "Local node_modules are optional but recommended for config validation." -ForegroundColor Cyan

# Check if EAS CLI is installed
if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "Installing EAS CLI..." -ForegroundColor Yellow
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

# Check for environment variables
Write-Host "Checking environment variables..." -ForegroundColor Cyan
$envFile = Join-Path (Split-Path -Parent $scriptPath) "..\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $supabaseUrl = ($envContent | Select-String "EXPO_PUBLIC_SUPABASE_URL").ToString().Split("=")[1]
    $supabaseKey = ($envContent | Select-String "EXPO_PUBLIC_SUPABASE_ANON_KEY").ToString().Split("=")[1]
    
    if ($supabaseUrl -and $supabaseKey) {
        Write-Host "Environment variables found. Setting for build..." -ForegroundColor Green
        $env:EXPO_PUBLIC_SUPABASE_URL = $supabaseUrl
        $env:EXPO_PUBLIC_SUPABASE_ANON_KEY = $supabaseKey
    } else {
        Write-Host "Warning: Environment variables not found in .env file" -ForegroundColor Yellow
        Write-Host "Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in EAS dashboard" -ForegroundColor Yellow
    }
} else {
    Write-Host "No .env file found. Make sure environment variables are set in EAS dashboard:" -ForegroundColor Yellow
    Write-Host "  https://expo.dev/accounts/[your-account]/projects/siteweave-mobile/settings/secrets" -ForegroundColor Cyan
}

# Build APK
Write-Host ""
Write-Host "Starting APK build..." -ForegroundColor Green
Write-Host "This will build an APK file that can be installed directly on Android devices." -ForegroundColor Cyan
Write-Host "The build will be processed on Expo's servers and may take 10-20 minutes." -ForegroundColor Cyan
Write-Host ""

eas build --platform android --profile apk

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Download the APK from the Expo dashboard:" -ForegroundColor Yellow
    Write-Host "   https://expo.dev/accounts/[your-account]/projects/siteweave-mobile/builds" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Or download via CLI:" -ForegroundColor Yellow
    Write-Host "   eas build:list --platform android --profile apk" -ForegroundColor Cyan
    Write-Host "   eas build:download --platform android --profile apk --latest" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Distribute the APK file directly to users" -ForegroundColor Yellow
    Write-Host "   Users can install it by enabling 'Install from unknown sources' in Android settings" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Build failed. Please check the error messages above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Make sure environment variables are set in EAS dashboard" -ForegroundColor Cyan
    Write-Host "- Check that you're logged in: eas whoami" -ForegroundColor Cyan
    Write-Host "- Verify your EAS project is configured: eas project:info" -ForegroundColor Cyan
    exit 1
}
