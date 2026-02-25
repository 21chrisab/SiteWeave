# GitHub Release Creator for SiteWeave Desktop v1.0.42
# Usage: .\create-release-1.0.42.ps1 -Token "your_github_token"
#    or: $env:GITHUB_TOKEN = "your_token"; .\create-release-1.0.42.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = $env:GITHUB_TOKEN
)

if (-not $Token) {
    Write-Host "Usage: .\create-release-1.0.42.ps1 -Token 'your_github_token'" -ForegroundColor Yellow
    Write-Host "   or set GITHUB_TOKEN env var" -ForegroundColor Yellow
    exit 1
}

$version = "1.0.42"
$owner = "21chrisab"
$repo = "SiteWeave"
$exePath = "release/SiteWeave Setup $version.exe"
$blockmapPath = "release/SiteWeave Setup $version.exe.blockmap"
$latestYmlPath = "release/latest.yml"

if (-not (Test-Path $exePath)) {
    Write-Host "Executable not found: $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "Creating GitHub release v$version..." -ForegroundColor Cyan

$releaseData = @{
    tag_name = "v$version"
    name = "SiteWeave v$version"
    body = @"
## SiteWeave Desktop v$version

### Progress Reports
- Simplified progress report flow (2-tab form, manual email default, plain-language schedule)
- Project vs organization reports with separate flows
- Edge function fixes and Outlook-style email preview

### Installation
Download and run the installer below.
"@
    draft = $false
    prerelease = $false
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "token $Token"
        "Accept" = "application/vnd.github.v3+json"
    }

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" `
        -Method Post -Headers $headers -Body $releaseData -ContentType "application/json; charset=utf-8"

    Write-Host "Release created." -ForegroundColor Green

    function Upload-File {
        param($FilePath, [string]$FileName)
        if (-not (Test-Path $FilePath)) { return }
        Write-Host "Uploading $FileName..." -ForegroundColor Cyan
        $uploadUrl = $release.upload_url -replace '\{.*\}', ''
        $uploadUrl = "$uploadUrl`?name=$([uri]::EscapeDataString($FileName))"
        $headers["Content-Type"] = "application/octet-stream"
        Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers -InFile (Resolve-Path $FilePath) | Out-Null
        Write-Host "  $FileName uploaded." -ForegroundColor Green
    }

    Upload-File -FilePath $exePath -FileName "SiteWeave Setup $version.exe"
    Upload-File -FilePath $blockmapPath -FileName "SiteWeave Setup $version.exe.blockmap"
    Upload-File -FilePath $latestYmlPath -FileName "latest.yml"

    Write-Host "Release ready at: $($release.html_url)" -ForegroundColor Green

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
    exit 1
}
