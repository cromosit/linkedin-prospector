@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Iniciando em modo PRODUCAO...
echo ========================================
echo.

cd /d "%USERPROFILE%\02 - linkedin-prospector\backend"

if not exist .env (
    echo [ERRO] Arquivo .env nao encontrado!
    pause
    exit
)

if not exist node_modules (
    echo Instalando dependencias...
    npm install
)

npm start
pause
