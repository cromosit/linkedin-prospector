@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Iniciando TUDO (Backend + Frontend)...
echo ========================================
echo.

:: Backend
start "LP Backend - porta 3000" cmd /k "cd /d \"%USERPROFILE%\02 - linkedin-prospector\backend\" && node server.js"

:: Aguarda backend subir
timeout /t 3 /nobreak > nul

:: Frontend
start "LP Frontend - porta 5173" cmd /k "cd /d \"%USERPROFILE%\02 - linkedin-prospector\frontend\" && npm run dev"

:: Aguarda e abre navegador
timeout /t 5 /nobreak > nul
start chrome http://localhost:5173

echo.
echo ========================================
echo  Backend:  http://localhost:3000
echo  Frontend: http://localhost:5173
echo ========================================
echo.
pause
