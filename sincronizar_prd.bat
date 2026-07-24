@echo off
title Sincronizar DEV para PRD
color 0B
echo.
echo ================================================
echo   Cromosit IT - Promovendo DEV para PRD
echo ================================================
echo.

echo Copiando arquivos do Frontend (ignorando node_modules)...
robocopy "01_DEV\frontend" "frontend" /MIR /XD node_modules dist .git

echo.
echo Copiando arquivos do Backend (ignorando node_modules)...
robocopy "01_DEV\backend" "03_PRD\backend" /MIR /XD node_modules .git

echo.
echo ================================================
echo   SINCRONIZACAO CONCLUIDA!
echo   Agora, abra a pasta 03_PRD e rode o git-salvar.bat
echo ================================================
echo.
pause
