param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $Path)) { throw "Standalone HTML not found: $Path" }
$html = Get-Content -Raw -Encoding UTF8 $Path
if ($html -notmatch "connect-src\s+'none'") { throw "CSP must block runtime connections with connect-src 'none'." }
if ($html -match '<script[^>]+src\s*=') { throw "External script reference detected." }
if ($html -match '<link[^>]+rel=["'']stylesheet["''][^>]+href\s*=') { throw "External stylesheet reference detected." }
if ($html -match '@import\s+url\s*\(') { throw "CSS @import detected." }
if ($html -notmatch '<textarea[^>]+id=["'']editor["'']') { throw "Editor element missing." }
Write-Host "[OK] Standalone verification passed." -ForegroundColor Green
