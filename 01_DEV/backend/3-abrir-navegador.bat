@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Abrindo no navegador...
echo ========================================
echo.

:: Aguarda 2 segundos para o servidor inicializar
timeout /t 2 /nobreak > nul

start chrome http://localhost:5174
start chrome http://localhost:3001/auth/linkedin

echo  Navegador aberto!
echo.
