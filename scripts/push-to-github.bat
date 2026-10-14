@echo off
title Push WattWise AI to GitHub
echo ========================================================
echo        Pushing WattWise AI to GitHub Repository
echo        https://github.com/ParmarBhuresh2006/WattWise-Ai.git
echo ========================================================
echo.
cd /d "%~dp0.."
git status
echo.
echo Executing git push -u origin main...
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Code successfully pushed to GitHub!
) else (
    echo [NOTE] If authentication failed, generate a GitHub Personal Access Token (PAT):
    echo        1. Go to https://github.com/settings/tokens
    echo        2. Generate Token with 'repo' permissions
    echo        3. Use your GitHub username and the PAT as your password.
)
echo.
pause
