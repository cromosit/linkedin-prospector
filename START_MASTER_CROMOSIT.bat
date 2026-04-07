@echo off
title IGNIÇÃO MASTER CROMOSIT IT - VERSÃO V1.1
color 0B
echo ########################################################
echo # 🚀 INICIANDO IMPÉRIO CROMOSIT IT - ARQUITETURA V1   #
echo ########################################################
echo.

:: Inicia o Backend VISÍVEL PARA DEBUGGING
echo [1/2] Ligando Motores do Backend (Porta 3000)...
start cmd /k "title SERVIDOR BACKEND && cd 01_DEV\backend && npm run dev"

:: Inicia o Frontend VISÍVEL PARA DEBUGGING
echo [2/2] Ligando Painel de Controle Frontend (Porta 5173)...
start cmd /k "title PAINEL FRONTEND && cd 01_DEV\frontend && npm run dev"

echo.
echo ########################################################
echo # ✅ SISTEMA OPERACIONAL - VERSÃO V1.1 MASTER         #
echo ########################################################
echo.
echo Abrindo o CRM no seu navegador DEV...
start http://localhost:5173/leads
timeout /t 5
exit
