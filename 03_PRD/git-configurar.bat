@echo off
title LinkedIn Prospector - Configurar GitHub
color 0B
echo.
echo ================================================
echo   LinkedIn Prospector - Cromosit IT
echo   Configuracao inicial do GitHub
echo ================================================
echo.

cd /d "%~dp0"

REM Verifica se Git esta instalado
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao esta instalado!
    echo Baixe em: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Configurar identidade
echo Configure sua identidade do GitHub:
set /p GIT_NAME="Seu nome (ex: Samuel Betim): "
set /p GIT_EMAIL="Seu email do GitHub: "

git config --global user.name "%GIT_NAME%"
git config --global user.email "%GIT_EMAIL%"

REM Inicializar repositório se necessário
if not exist ".git" (
    git init
    git branch -M main
    echo Repositorio Git inicializado.
) else (
    echo Repositorio Git ja existe.
)

REM Criar .gitignore se não existir
if not exist ".gitignore" (
    echo node_modules/ > .gitignore
    echo .env >> .gitignore
    echo backend/.env >> .gitignore
    echo *.zip >> .gitignore
    echo frontend/dist/ >> .gitignore
    echo Arquivo .gitignore criado.
)

REM Configurar remote
echo.
echo Cole a URL do seu repositorio GitHub:
echo (ex: https://github.com/seuusuario/linkedin-prospector.git)
set /p REPO_URL="URL: "

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

REM Primeiro commit
git add -A
git commit -m "LinkedIn Prospector v8 - Setup inicial Cromosit IT"

echo.
echo Enviando para o GitHub (pode pedir login)...
git push -u origin main

if errorlevel 1 (
    echo.
    echo [AVISO] Se pediu autenticacao, use seu usuario e token do GitHub.
    echo Para criar token: GitHub -> Settings -> Developer settings -> Personal access tokens
    echo.
    pause
    git push -u origin main
)

echo.
echo ================================================
echo   CONFIGURADO COM SUCESSO!
echo   A partir de agora use git-salvar.bat
echo ================================================
echo.
pause
