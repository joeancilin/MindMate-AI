$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

function Stop-PortProcess($Port) {
  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    if ($pid -and $pid -ne $PID) {
      Write-Host "Stopping process on port $Port (PID $pid)"
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
  }
}

function Wait-Url($Url, $Name) {
  for ($i = 0; $i -lt 30; $i++) {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2 | Out-Null
      Write-Host "$Name is ready: $Url" -ForegroundColor Green
      return $true
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  Write-Host "$Name did not answer in time: $Url" -ForegroundColor Yellow
  return $false
}

Write-Host "Restarting MindMate..." -ForegroundColor Cyan
Stop-PortProcess 5173
Stop-PortProcess 8000

Write-Host "Starting backend..."
Start-Process powershell.exe -ArgumentList @(
  "-NoProfile",
  "-NoExit",
  "-Command",
  "Set-Location '$Backend'; python -m uvicorn api.Main:app --host 127.0.0.1 --port 8000"
)

Write-Host "Starting frontend..."
Start-Process powershell.exe -ArgumentList @(
  "-NoProfile",
  "-NoExit",
  "-Command",
  "Set-Location '$Frontend'; npm.cmd run dev -- --host 127.0.0.1"
)

$backendReady = Wait-Url "http://127.0.0.1:8000/health" "Backend"
$frontendReady = Wait-Url "http://127.0.0.1:5173" "Frontend"

if ($backendReady -and $frontendReady) {
  Start-Process "http://127.0.0.1:5173"
  Write-Host ""
  Write-Host "MindMate is running." -ForegroundColor Green
  Write-Host "Use: http://127.0.0.1:5173"
} else {
  Write-Host ""
  Write-Host "One server failed to start. Check the backend/frontend PowerShell windows for the exact error." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to close this launcher"
