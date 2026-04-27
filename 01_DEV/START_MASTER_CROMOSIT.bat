@echo off
title IGNIÇÃO MASTER CROMOSIT IT - VERSÃO V1.3
color 0B
echo ########################################################
echo # 🚀 INICIANDO IMPÉRIO CROMOSIT IT - ARQUITETURA V1.3  #
echo ########################################################
echo.

:: Mata processos antigos para evitar conflito de portas (apenas Node)
echo [0/2] Limpando processos antigos...
:: taskkill /f /im node.exe >nul 2>&1

:: Inicia o Backend VISÍVEL PARA DEBUGGING
echo [1/2] Ligando Motores do Backend (Porta 3001)...
start cmd /k "title SERVIDOR BACKEND && cd backend && npm run dev"

:: Inicia o Frontend VISÍVEL PARA DEBUGGING
echo [2/2] Ligando Painel de Controle Frontend (Porta 5174)...
start cmd /k "title PAINEL FRONTEND && cd frontend && npm run dev"

echo.
echo ########################################################
echo # ✅ SISTEMA OPERACIONAL - VERSÃO V1.3 MASTER         #
echo ########################################################
echo.
echo Abrindo o CRM no seu navegador DEV...
timeout /t 5
start http://localhost:5174/leads
exit
