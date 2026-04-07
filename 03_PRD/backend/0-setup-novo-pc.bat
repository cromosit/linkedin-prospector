@echo off
setlocal

echo.
echo ============================================================
echo  LinkedIn Prospector - Cromosit IT
echo  SETUP COMPLETO - Novo computador
echo ============================================================
echo.

:: Define a pasta raiz do projeto baseada neste arquivo
set "RAIZ=%~dp0.."
set "BACKEND=%~dp0"
set "BACKEND=%BACKEND:~0,-1%"
set "FRONTEND=%RAIZ%\frontend"

echo  Pasta do projeto detectada automaticamente:
echo  Backend:  %BACKEND%
echo  Frontend: %FRONTEND%
echo.
pause

:: ============================================================
:: ETAPA 1 — Verificar Node.js
:: ============================================================
echo [ETAPA 1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERRO] Node.js NAO encontrado!
    echo  Baixe e instale em: https://nodejs.org
    echo  Versao minima: v18
    echo.
    pause
    exit /b 1
)
echo  Node.js OK: 
node --version
echo.

:: ============================================================
:: ETAPA 2 — Instalar dependencias do Backend
:: ============================================================
echo [ETAPA 2/4] Instalando dependencias do BACKEND...
cd /d "%BACKEND%"
npm install
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar dependencias do backend!
    pause
    exit /b 1
)
echo  Backend: dependencias instaladas!
echo.

:: ============================================================
:: ETAPA 3 — Instalar dependencias do Frontend
:: ============================================================
echo [ETAPA 3/4] Instalando dependencias do FRONTEND...
cd /d "%FRONTEND%"
if not exist "%FRONTEND%" (
    echo  [ERRO] Pasta frontend nao encontrada: %FRONTEND%
    pause
    exit /b 1
)
npm install
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar dependencias do frontend!
    pause
    exit /b 1
)
echo  Frontend: dependencias instaladas!
echo.

:: ============================================================
:: ETAPA 4 — Configurar .env
:: ============================================================
echo [ETAPA 4/4] Configurando arquivo .env...
cd /d "%BACKEND%"

if exist ".env" (
    echo  Arquivo .env JA EXISTE. Nao sera substituido.
) else (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  Arquivo .env criado a partir do template!
    ) else (
        echo  [AVISO] .env.example nao encontrado. Crie o .env manualmente.
    )
)
echo.

:: ============================================================
:: INSTRUCOES FINAIS
:: ============================================================
echo ============================================================
echo  SETUP CONCLUIDO!
echo ============================================================
echo.
echo  PROXIMO PASSO OBRIGATORIO:
echo  Abra o arquivo .env e preencha com suas chaves:
echo.
echo   1. SUPABASE_URL e SUPABASE_KEY (supabase.com - service_role)
echo   2. LINKEDIN_CLIENT_ID e LINKEDIN_CLIENT_SECRET
echo   3. OPENAI_API_KEY (platform.openai.com)
echo   4. CHATWA_TOKEN e VENDEDOR_WHATSAPP
echo.
echo  Depois de preencher o .env, execute:
echo  -> 8-iniciar-tudo.bat  (sobe tudo e abre o Chrome)
echo.

set /p ABRIR="Abrir o .env agora para editar? (S/N): "
if /i "%ABRIR%"=="S" (
    notepad "%BACKEND%\.env"
)

echo.
pause
endlocal
