@echo off
title WattWise AI - Backend Server
echo [WattWise AI] Starting Node.js Backend API Server (Port 5000)...
cd /d "%~dp0..\backend"
npm run dev
pause
