@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules\express\package.json (
  echo [RAKSHA] Dependencies are missing. Running setup first...
  call SETUP-RAKSHA.cmd
  if errorlevel 1 exit /b 1
)

if not exist .env copy /Y .env.example .env >nul

echo ======================================
echo          RAKSHA BACKEND API
echo ======================================
echo Health after start: http://localhost:4000/api/health
echo.
call npm run server
