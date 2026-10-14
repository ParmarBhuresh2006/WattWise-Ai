# start-all.ps1 — PowerShell launcher for WattWise AI
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir   = Split-Path -Parent $scriptDir

Write-Host "========================================================" -ForegroundColor Green
Write-Host "       WATTWISE AI — SUSTAINABLE ENERGY OPTIMIZER      " -ForegroundColor Green
Write-Host "            PowerShell Service Launcher               " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

Write-Host "[1/3] Starting Python ML Engine on port 8001..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$rootDir\ml-engine\src`" && python server.py"

Write-Host "[2/3] Starting Express Backend on port 5000..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$rootDir\backend`" && npm run dev"

Write-Host "[3/3] Starting React Vite Frontend on port 5173..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$rootDir\frontend`" && npm run dev"

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend:   http://localhost:5000" -ForegroundColor Yellow
Write-Host "ML Engine: http://127.0.0.1:8001" -ForegroundColor Yellow
