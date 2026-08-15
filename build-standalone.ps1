param([switch]$ForceDownload)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $Root "src\index.template.html"
$Dist = Join-Path $Root "dist"
if (-not (Test-Path $Source)) { throw "Source file is missing: src\index.template.html" }
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
$app = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
$deps = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "dependencies.json") | ConvertFrom-Json
if ($deps.dependencies.Count -ne 0) { throw "This repository currently expects zero runtime dependencies." }
$output = Join-Path $Root $app.build.output
Copy-Item -Force $Source $output
@{ generatedAt = (Get-Date).ToUniversalTime().ToString("o"); dependencies = @(); runtimeNetworkBlocked = [bool]$app.build.blockRuntimeNetwork } | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $Dist "dependency-manifest.json")
New-Item -ItemType File -Force -Path (Join-Path $Dist ".nojekyll") | Out-Null
& (Join-Path $Root "scripts\build-self-extract.ps1") -InputPath $output -OutputPath (Join-Path $Root $app.build.selfExtract.output)
& (Join-Path $Root "scripts\verify-standalone.ps1") -Path $output
& (Join-Path $Root "scripts\verify-self-extract.ps1") -Path (Join-Path $Root $app.build.selfExtract.output)
Write-Host "[OK] Built $($app.build.output)" -ForegroundColor Green
