# PowerShell script to create GitHub release and upload executable
# Usage: .\create-github-release.ps1 -GitHubToken "your_token_here"

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubToken,
    
    [string]$Version = "1.0.35",
    [string]$Owner = "21chrisab",
    [string]$Repo = "SiteWeave"
)

$exePath = "release/SiteWeave Setup $Version.exe"
$blockmapPath = "release/SiteWeave Setup $Version.exe.blockmap"

if (-not (Test-Path $exePath)) {
    Write-Host "Error: Executable not found at $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "Creating GitHub release v$Version..." -ForegroundColor Cyan

# Create release
$releaseBody = @{
    tag_name = "v$Version"
    name = "SiteWeave v$Version"
    body = @"
## SiteWeave Desktop v$Version

### New Features
- B2B Multi-tenant onboarding with edge functions
- Team management with permission-based access control
- Setup wizard for new organization admins
- Dynamic roles with granular permissions
- Guest access for project collaborators

### Installation
Download and run `SiteWeave Setup $Version.exe` to install.

### Changes
- Implemented organization-based multi-tenancy
- Added team management modal with can_manage_team permission
- Added setup wizard for first-time admin configuration
- Updated onboarding workflow for construction industry
- Fixed TypeScript configuration warnings
"@
    draft = $false
    prerelease = $false
} | ConvertTo-Json

try {
    $releaseResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/releases" `
        -Method Post `
        -Headers @{
            "Authorization" = "token $GitHubToken"
            "Accept" = "application/vnd.github.v3+json"
        } `
        -Body $releaseBody `
        -ContentType "application/json"

    $uploadUrl = $releaseResponse.upload_url -replace '\{.*\}', ''
    Write-Host "Release created! Upload URL: $uploadUrl" -ForegroundColor Green

    # Upload executable
    Write-Host "Uploading executable..." -ForegroundColor Cyan
    $exeBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $exePath))
    $exeBase64 = [System.Convert]::ToBase64String($exeBytes)
    
    $exeName = "SiteWeave Setup $Version.exe"
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$exeName`"",
        "Content-Type: application/octet-stream",
        "",
        [System.Text.Encoding]::UTF8.GetString($exeBytes)
        "--$boundary--"
    )
    $body = $bodyLines -join "`r`n"
    
    $uploadResponse = Invoke-RestMethod -Uri "$uploadUrl?name=$exeName" `
        -Method Post `
        -Headers @{
            "Authorization" = "token $GitHubToken"
            "Accept" = "application/vnd.github.v3+json"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($body))

    Write-Host "✅ Executable uploaded successfully!" -ForegroundColor Green
    Write-Host "Release URL: $($releaseResponse.html_url)" -ForegroundColor Cyan

    # Upload blockmap if it exists
    if (Test-Path $blockmapPath) {
        Write-Host "Uploading blockmap..." -ForegroundColor Cyan
        $blockmapContent = Get-Content $blockmapPath -Raw
        $blockmapName = "SiteWeave Setup $Version.exe.blockmap"
        
        $blockmapBody = @{
            name = $blockmapName
            label = $blockmapName
        } | ConvertTo-Json
        
        $blockmapBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $blockmapPath))
        $blockmapBoundary = [System.Guid]::NewGuid().ToString()
        $blockmapBodyLines = @(
            "--$blockmapBoundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"$blockmapName`"",
            "Content-Type: application/octet-stream",
            "",
            [System.Text.Encoding]::UTF8.GetString($blockmapBytes)
            "--$blockmapBoundary--"
        )
        $blockmapBodyContent = $blockmapBodyLines -join "`r`n"
        
        $blockmapUpload = Invoke-RestMethod -Uri "$uploadUrl?name=$blockmapName" `
            -Method Post `
            -Headers @{
                "Authorization" = "token $GitHubToken"
                "Accept" = "application/vnd.github.v3+json"
                "Content-Type" = "multipart/form-data; boundary=$blockmapBoundary"
            } `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($blockmapBodyContent))
        
        Write-Host "✅ Blockmap uploaded successfully!" -ForegroundColor Green
    }

    Write-Host "`n🎉 Release created and files uploaded!" -ForegroundColor Green
    Write-Host "View release at: $($releaseResponse.html_url)" -ForegroundColor Cyan

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
