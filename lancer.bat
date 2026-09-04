@echo off
setlocal
cd /d "%~dp0"

rem Ports peu courants, pour eviter 3000 / 5173 / 8080 / etc.
set "UI_PORT=47127"
set "API_PORT=47128"
set "PORT=%API_PORT%"

echo.
echo  Calendrier de saison
echo  Interface : http://127.0.0.1:%UI_PORT%
echo  API       : http://127.0.0.1:%API_PORT%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js est introuvable. Installez-le puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist "node_modules\" call npm install
if not exist "client\node_modules\" call npm install --prefix client
if not exist "server\node_modules\" call npm install --prefix server

start "" cmd /c "timeout /t 5 /nobreak >nul && start http://127.0.0.1:%UI_PORT%"

call npm run dev
if errorlevel 1 pause
