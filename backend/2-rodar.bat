@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Iniciando BACKEND...
echo ========================================
echo.

cd /d C:\Users\samue\linkedin-prospector\backend

if not exist node_modules (
    echo Instalando dependencias...
    npm install
)

echo  Backend rodando em: http://localhost:3000
echo  Pressione CTRL+C para parar
echo.

node server.js
pause
