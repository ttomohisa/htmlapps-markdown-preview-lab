param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path $Path)) { throw "Self-extract HTML not found: $Path" }
$normal = Join-Path $Root "dist\index.html"
if (-not (Test-Path $normal)) { throw "Normal standalone HTML not found." }
$normalHash = (Get-FileHash -Algorithm SHA256 $normal).Hash
$selfHash = (Get-FileHash -Algorithm SHA256 $Path).Hash
if ($normalHash -ne $selfHash) { throw "With zero dependencies, self-extract output should match standalone output." }
Write-Host "[OK] Self-extract verification passed." -ForegroundColor Green
