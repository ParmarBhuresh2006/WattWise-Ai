@echo off
title WattWise AI - Machine Learning Engine
echo [WattWise AI] Starting Python ML Engine (Port 8001 - Loopback only)...
cd /d "%~dp0..\ml-engine\src"
python server.py
pause
