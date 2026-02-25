# Quick GitHub Release Creator for v1.0.41
# Usage: .\create-release-1.0.41.ps1 -Token "your_github_token"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$version = "1.0.41"
$owner = "21chrisab"
$repo = "SiteWeave"
$exePath = "release/SiteWeave Setup $version.exe"
$blockmapPath = "release/SiteWeave Setup $version.exe.blockmap"
$latestYmlPath = "release/latest.yml"

if (-not (Test-Path $exePath)) {
    Write-Host "❌ Executable not found: $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Creating GitHub release v$version..." -ForegroundColor Cyan

# Create release
$releaseData = @{
    tag_name = "v$version"
    name = "SiteWeave v$version"
    body = @"
## SiteWeave Desktop v$version

### Auto-Update Fix
- Fixed auto-updater to automatically download and install updates
- Enabled autoDownload and autoInstallOnAppQuit settings
- Users will now receive automatic updates when new versions are available

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
        -Method Post -Headers $headers -Body $releaseData -ContentType "application/json"
    
    Write-Host "✅ Release created!" -ForegroundColor Green
    
    # Function to upload file
    function Upload-File {
        param($FilePath, $FileName)
        Write-Host "📤 Uploading $FileName..." -ForegroundColor Cyan
        $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $FilePath))
        $boundary = [System.Guid]::NewGuid().ToString()
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"$FileName`"",
            "Content-Type: application/octet-stream",
            "",
            [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
            "--$boundary--"
        )
        $body = $bodyLines -join "`r`n"
        $bodyBytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($body)
        
        $uploadUrl = $release.upload_url -replace '\{.*\}', ''
        Invoke-RestMethod -Uri "$uploadUrl?name=$FileName" `
            -Method Post -Headers $headers `
            -ContentType "multipart/form-data; boundary=$boundary" `
            -Body $bodyBytes | Out-Null
        Write-Host "✅ $FileName uploaded!" -ForegroundColor Green
    }
    
    # Upload all files
    Upload-File -FilePath $exePath -FileName "SiteWeave Setup $version.exe"
    
    if (Test-Path $blockmapPath) {
        Upload-File -FilePath $blockmapPath -FileName "SiteWeave Setup $version.exe.blockmap"
    }
    
    if (Test-Path $latestYmlPath) {
        Upload-File -FilePath $latestYmlPath -FileName "latest.yml"
    }
    
    Write-Host "`n🎉 Release ready at: $($release.html_url)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
