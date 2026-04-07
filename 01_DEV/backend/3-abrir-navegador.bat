@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Abrindo no navegador...
echo ========================================
echo.

:: Aguarda 2 segundos para o servidor inicializar
timeout /t 2 /nobreak > nul

:: Abre o navegador nos endpoints principais
start chrome http://localhost:3000
start chrome http://localhost:3000/auth/linkedin

echo  Navegador aberto!
echo.
