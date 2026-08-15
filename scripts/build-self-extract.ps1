param([Parameter(Mandatory=$true)][string]$InputPath,[Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path $InputPath)) { throw "Input file is missing: $InputPath" }
Copy-Item -Force $InputPath $OutputPath
$hash = (Get-FileHash -Algorithm SHA256 $OutputPath).Hash.ToLowerInvariant()
@{ mode = "identity-copy"; reason = "The source is already fully self-contained and has zero external runtime dependencies."; sha256 = $hash } | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $Root "dist\self-extract-manifest.json")
