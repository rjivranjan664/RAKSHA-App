@echo off
setlocal
cd /d "%~dp0"

echo ======================================
echo        RAKSHA - FIRST TIME SETUP
echo ======================================
echo Project: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not in PATH.
  echo Install Node.js 20 LTS, reopen CMD, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  echo Reinstall Node.js 20 LTS and reopen CMD.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set NODE_MAJOR=%%V
if %NODE_MAJOR% LSS 18 (
  echo [ERROR] Node.js 18 or newer is required. Current:
  node --version
  pause
  exit /b 1
)

echo Node:
node --version
echo npm:
npm --version

echo.
echo Installing project dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  echo Check your internet connection and npm registry access, then run SETUP-RAKSHA.cmd again.
  pause
  exit /b 1
)
