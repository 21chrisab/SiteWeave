# Quick GitHub Release Creator for v1.0.36
# Usage: .\quick-release.ps1 -Token "your_github_token"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$version = "1.0.36"
$owner = "21chrisab"
$repo = "SiteWeave"
$exePath = "release/SiteWeave Setup $version.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "❌ Executable not found: $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Creating GitHub release v$version..." -ForegroundColor Cyan

# Create release
$releaseData = @{
    tag_name = "v$version"
    name = "SiteWeave v$version"
    body = "## SiteWeave Desktop v$version`n`n### New Features`n- Role Management Deck on Organization Directory`n- Redesigned Calendar Invite Email`n- Enhanced team management`n`n### Installation`nDownload and run the installer below."
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
    
    # Upload file
    Write-Host "📤 Uploading executable..." -ForegroundColor Cyan
    $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $exePath))
    $fileName = "SiteWeave Setup $version.exe"
    $boundary = [System.Guid]::NewGuid().ToString()
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: application/octet-stream",
        "",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
        "--$boundary--"
    )
    $body = $bodyLines -join "`r`n"
    $bodyBytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($body)
    
    $uploadUrl = $release.upload_url -replace '\{.*\}', ''
    Invoke-RestMethod -Uri "$uploadUrl?name=$fileName" `
        -Method Post -Headers $headers `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyBytes | Out-Null
    
    Write-Host "✅ File uploaded!" -ForegroundColor Green
    Write-Host "`n🎉 Release ready at: $($release.html_url)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
