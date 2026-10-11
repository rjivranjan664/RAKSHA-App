@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules\vite\package.json (
  echo [RAKSHA] Dependencies are missing. Running setup first...
  call SETUP-RAKSHA.cmd
  if errorlevel 1 exit /b 1
)

echo ======================================
echo          RAKSHA FRONTEND
echo ======================================
echo Open after start: http://localhost:5173
echo.
call npm run dev
