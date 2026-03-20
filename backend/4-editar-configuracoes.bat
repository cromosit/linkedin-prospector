@echo off
echo.
echo ========================================
echo  LinkedIn Prospector - Cromosit IT
echo  Abrindo configuracoes (.env)...
echo ========================================
echo.

cd /d C:\Users\samue\linkedin-prospector

if not exist .env (
    echo Criando .env a partir do exemplo...
    copy .env.example .env
    echo Arquivo .env criado!
    echo.
)

:: Abre o .env no Bloco de Notas para editar
notepad .env
