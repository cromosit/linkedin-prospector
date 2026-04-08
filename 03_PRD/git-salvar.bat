@echo off
title LinkedIn Prospector - Salvar no GitHub
color 0A
echo.
echo ================================================
echo   LinkedIn Prospector - Cromosit IT
echo   Salvando alteracoes no GitHub...
echo ================================================
echo.

cd /d C:\Users\samue\linkedin-prospector

REM Verifica se Git está configurado
git status >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao esta configurado nesta pasta.
    echo Execute git-configurar.bat primeiro.
    pause
    exit /b 1
)

REM Mostra o que vai ser salvo
echo Arquivos alterados:
git status --short
echo.

REM Pede mensagem do commit
set /p MSG="Descricao do que voce fez (ex: corrigiu bug do telefone): "
if "%MSG%"=="" set MSG=Atualizacao automatica %date% %time%

REM Adiciona todos os arquivos
git add -A

REM Faz o commit
git commit -m "%MSG%"

REM Envia para o GitHub
git push origin main

if errorlevel 1 (
    echo.
    echo [AVISO] Erro ao enviar. Tentando com pull primeiro...
    git pull origin main --rebase
    git push origin main
)

echo.
echo ================================================
echo   SALVO COM SUCESSO no GitHub!
echo   Commit: %MSG%
echo ================================================
echo.
pause
