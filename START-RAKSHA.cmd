@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules\express\package.json (
  echo [RAKSHA] First run detected. Installing dependencies...
  call SETUP-RAKSHA.cmd
  if errorlevel 1 exit /b 1
)

if not exist node_modules\vite\package.json (
  echo [RAKSHA] Frontend dependencies are incomplete. Repairing install...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

if not exist .env copy /Y example.env .env >nul

echo Starting RAKSHA backend and frontend in separate windows...
start "RAKSHA Backend API" "%ComSpec%" /k call "%~dp0START-API.cmd"
timeout /t 2 /nobreak >nul
start "RAKSHA Frontend" "%ComSpec%" /k call "%~dp0START-APP.cmd"

echo.
echo Backend health: http://localhost:4000/api/health
echo Application:    http://localhost:5173
echo.
echo Keep both command windows open while using RAKSHA.
pause
