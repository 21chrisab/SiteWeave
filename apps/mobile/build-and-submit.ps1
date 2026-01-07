# PowerShell script to build and submit iOS app

Write-Host "Starting iOS build process..." -ForegroundColor Green

# Start the build
$buildProcess = Start-Process -FilePath "eas" -ArgumentList "build", "--platform", "ios", "--profile", "production" -NoNewWindow -PassThru -Wait

if ($buildProcess.ExitCode -eq 0) {
    Write-Host "Build completed successfully!" -ForegroundColor Green
    
    # Get the latest build ID
    Write-Host "Getting build ID..." -ForegroundColor Yellow
    $buildList = eas build:list --platform ios --limit 1 --json | ConvertFrom-Json
    $buildId = $buildList[0].id
    
    Write-Host "Build ID: $buildId" -ForegroundColor Cyan
    
    # Submit to App Store
    Write-Host "Submitting to App Store..." -ForegroundColor Green
    eas submit --platform ios --profile production --id $buildId --non-interactive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully submitted to App Store!" -ForegroundColor Green
    } else {
        Write-Host "Submission failed. Please check the logs." -ForegroundColor Red
    }
} else {
    Write-Host "Build failed. Please check the logs." -ForegroundColor Red
}
























