@echo off
title LinkedIn Prospector - Corrigir Dependencias
color 0A
echo.
echo ================================================
echo   Sincronizando dependencias (package-lock.json)
echo ================================================
echo.

cd /d "%~dp0"
cd backend
call npm install

echo.
echo ================================================
echo   PRONTO! Dependencias atualizadas.
echo   Agora, rode o seu git-salvar.bat novamente!
echo ================================================
echo.
pause
