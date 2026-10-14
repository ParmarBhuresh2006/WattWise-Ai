@echo off
title WattWise AI - Launcher
echo ========================================================
echo         WATTWISE AI — SUSTAINABLE ENERGY OPTIMIZER
echo              Local Multi-Process Launcher
echo ========================================================
echo.
echo [1/3] Launching Python Machine Learning Engine (Port 8001)...
start "WattWise ML Engine" cmd /k "%~dp0start-ml.bat"

echo [2/3] Launching Node.js Express Backend (Port 5000)...
start "WattWise Backend" cmd /k "%~dp0start-backend.bat"

echo [3/3] Launching React Vite Frontend (Port 5173)...
start "WattWise Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo All services launched in dedicated terminal windows!
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:5000/health
echo - ML Engine: http://127.0.0.1:8001/health
echo.
echo Press any key to close this launcher window.
pause > nul
