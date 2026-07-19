@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Iniciando TUDO (Backend + Frontend)...
echo ========================================
echo.

:: Entra no diretório deste script bat
cd /d "%~dp0"

:: Backend
start "LP Backend - porta 3001" cmd /k "node server.js"

:: Aguarda backend subir
timeout /t 3 /nobreak > nul

:: Frontend
start "LP Frontend - porta 5174" cmd /k "cd /d "%~dp0..\frontend" && npm run dev"

:: Aguarda e abre navegador
timeout /t 5 /nobreak > nul
start chrome http://localhost:5174

echo.
echo ========================================
echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:5174
echo ========================================
echo.
