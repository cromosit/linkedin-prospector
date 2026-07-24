@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Iniciando FRONTEND...
echo ========================================
echo.

cd /d "%USERPROFILE%\02 - linkedin-prospector\frontend"

if not exist node_modules (
    echo Instalando dependencias...
    npm install
)

echo  Frontend rodando em: http://localhost:5174
echo  Pressione CTRL+C para parar
echo.

npm run dev
pause
