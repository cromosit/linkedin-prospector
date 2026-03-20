@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Liberando porta 3000 e reiniciando...
echo ========================================
echo.

:: Mata qualquer processo usando a porta 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Matando processo %%a na porta 3000...
    taskkill /PID %%a /F >nul 2>&1
)

echo Porta 3000 liberada!
echo.

:: Aguarda 1 segundo e inicia o servidor
timeout /t 1 /nobreak > nul

cd /d C:\Users\samue\linkedin-prospector
npm run dev
pause
