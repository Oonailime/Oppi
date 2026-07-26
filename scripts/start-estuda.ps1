param(
  [string]$WebPort,
  [string]$ApiPort,
  [switch]$InstallHostOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$localDomain = "estuda.local"
$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"

function Test-LocalDomain {
  $escapedDomain = [regex]::Escape($localDomain)
  return [bool](Get-Content $hostsPath -ErrorAction SilentlyContinue |
    Where-Object { $_ -match "^\s*127\.0\.0\.1\s+.*\b$escapedDomain\b" })
}

function Install-LocalDomain {
  if (Test-LocalDomain) {
    return
  }

  Add-Content -Path $hostsPath -Value "`r`n127.0.0.1 $localDomain #Estuda Local Site" -Encoding ASCII
  & ipconfig.exe /flushdns | Out-Null
}

function Ensure-LocalDomain {
  if (Test-LocalDomain) {
    return
  }

  Write-Host "Configurando o dominio local $localDomain..." -ForegroundColor Yellow
  $elevated = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $PSCommandPath,
    "-InstallHostOnly"
  )
  if ($elevated.ExitCode -ne 0 -or -not (Test-LocalDomain)) {
    throw "Nao foi possivel configurar $localDomain no arquivo hosts."
  }
}

function Read-ValidatedPort {
  param(
    [string]$Value,
    [string]$Prompt,
    [int]$Default
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    $Value = Read-Host "$Prompt [$Default]"
  }
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Default
  }

  $parsed = 0
  if (-not [int]::TryParse($Value, [ref]$parsed)) {
    throw "$Prompt deve ser um numero."
  }
  if ($parsed -lt 1024 -or $parsed -gt 65535) {
    throw "$Prompt deve estar entre 1024 e 65535."
  }

  return $parsed
}

try {
  if ($InstallHostOnly) {
    Install-LocalDomain
    exit 0
  }

  Ensure-LocalDomain
  $webPortValue = Read-ValidatedPort $WebPort "Porta do site" 4000
  $apiPortValue = Read-ValidatedPort $ApiPort "Porta da API" ($webPortValue + 1)

  if ($webPortValue -eq $apiPortValue) {
    throw "O site e a API precisam usar portas diferentes."
  }

  $siteUrl = "http://${localDomain}:$webPortValue"
  $apiUrl = "http://${localDomain}:$apiPortValue/api"

  Write-Host ""
  Write-Host "Site: $siteUrl" -ForegroundColor Cyan
  Write-Host "API:  $apiUrl" -ForegroundColor Cyan
  Write-Host ""

  if (Get-Command wsl.exe -ErrorAction SilentlyContinue) {
    if ($projectRoot -notmatch "^([A-Za-z]):\\(.*)$") {
      throw "Nao foi possivel converter o caminho do projeto para o WSL."
    }
    $drive = $Matches[1].ToLowerInvariant()
    $relativeProject = $Matches[2].Replace("\", "/")
    $wslProject = "/mnt/$drive/$relativeProject"
    $escapedProject = $wslProject.Replace("'", "'\''")
    $command = ". `"`$HOME/.nvm/nvm.sh`" && cd '$escapedProject' && node scripts/start-estuda.mjs --host=$localDomain --web-port=$webPortValue --api-port=$apiPortValue --open"
    & wsl.exe bash -lc $command
  } else {
    Push-Location $projectRoot
    try {
      & node scripts/start-estuda.mjs `
        "--host=$localDomain" `
        "--web-port=$webPortValue" `
        "--api-port=$apiPortValue" `
        "--open"
    } finally {
      Pop-Location
    }
  }

  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} catch {
  Write-Host ""
  Write-Host "[Estuda] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
