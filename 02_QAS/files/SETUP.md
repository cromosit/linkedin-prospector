# ⚙️ Guia de Setup — LinkedIn Prospector Cromosit IT

> Versão: 8.0 | Data: 20/03/2026  
> Siga este guia na ordem exata. Cada etapa depende da anterior.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Download |
|---|---|---|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ | (incluído com Node.js) |
| Google Chrome | qualquer | https://chrome.google.com |
| Git | qualquer | https://git-scm.com |

---

## Estrutura de Pastas

```
C:\Users\<seu-usuario>\linkedin-prospector\
├── backend\                ← Servidor Node.js (porta 3000)
│   ├── server.js
│   ├── package.json
│   ├── .env                ← CRIAR A PARTIR DO .env.example
│   ├── routes\
│   │   ├── auth.js
│   │   ├── leads.js
│   │   └── notify.js
│   ├── middleware\
│   │   └── auth.js
│   └── config\
│       ├── supabase.js
│       └── database.sql
├── frontend\               ← React/Vite (porta 5173)
│   ├── src\
│   │   ├── pages\
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Leads.jsx
│   │   └── components\
│   │       └── LeadHistorico.jsx
│   ├── package.json
│   └── vite.config.js
├── extension\              ← Extensão Google Chrome
│   ├── manifest.json
│   ├── content.js
│   ├── popup.html
│   └── popup.js
├── README.md
├── ERRORS_LOG.md
├── git-configurar.bat
└── git-salvar.bat
```

---

## Etapa 1 — Supabase (Banco de Dados)

### 1.1 Criar conta e projeto
1. Acesse https://supabase.com → **Sign Up** (gratuito)
2. Clique em **New Project**
3. Preencha:
   - **Name:** `linkedin-prospector`
   - **Region:** `South America (São Paulo)`
   - **Password:** crie uma senha forte (guarde!)
4. Aguarde ~3 minutos até o projeto ficar ativo

### 1.2 Pegar as chaves
1. Menu lateral → **Project Settings** (ícone ⚙️)
2. Clique em **API**
3. Copie:
   - **Project URL** → será o `SUPABASE_URL`
   - **service_role** (em "Project API keys") → será o `SUPABASE_KEY`

> ⚠️ Use a chave **service_role**, não a `anon`. A `anon` causa erro de permissão.

### 1.3 Criar as tabelas
1. Menu lateral → **SQL Editor** → **New Query**
2. Cole o conteúdo de `backend/config/database.sql`
3. Clique em **Run** (ou `Ctrl + Enter`)
4. Resultado esperado: `Success. No rows returned`

### 1.4 Migrations adicionais (se necessário)
Se o banco já existir e precisar de novas colunas:
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS connection_degree TEXT DEFAULT '3';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mutual_connections TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followers TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS can_connect BOOLEAN DEFAULT true;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS connected_since TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS service_interest TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
```

---

## Etapa 2 — LinkedIn Developer Portal

### 2.1 Criar o app
1. Acesse https://www.linkedin.com/developers/apps
2. Clique em **Create app**
3. Preencha:
   - **App name:** `LinkedIn Prospector Cromosit`
   - **LinkedIn Page:** página da Cromosit no LinkedIn
4. Clique em **Create app**

### 2.2 Configurar redirect URL
1. Aba **Auth** do app criado
2. Em **Authorized redirect URLs**, adicione:
   ```
   http://localhost:3000/auth/linkedin/callback
   ```

### 2.3 Solicitar produto
1. Aba **Products**
2. Clique em **Request access** em:
   - ✅ `Sign In with LinkedIn using OpenID Connect`
3. Aprovação: 1–3 dias úteis

### 2.4 Copiar credenciais
Da aba **Auth**, copie:
- **Client ID**
- **Primary Client Secret**

---

## Etapa 3 — Configurar o .env

Na pasta `backend/`, copie `.env.example` para `.env` e preencha:

```env
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=cole_aqui
LINKEDIN_CLIENT_SECRET=cole_aqui
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback

# Autenticação JWT (pode ser qualquer string segura)
JWT_SECRET=cromosit-prospector-chave-secreta-2026

# Supabase
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_KEY=sb_secret_...   ← service_role key

# IA (OpenAI recomendado)
OPENAI_API_KEY=sk-proj-...

# ChatWA (envio WhatsApp)
CHATWA_API_URL=https://apichatwa.cromosit.com/api/messages
CHATWA_TOKEN=HiYooAHPQI66uey1HJj0YWkYPq6BWyIB

# Notificações
VENDEDOR_WHATSAPP=5541XXXXXXXXX

# Ambiente
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

> ⚠️ NUNCA commitar o `.env` no Git. Ele está no `.gitignore`.

---

## Etapa 4 — Instalar e Rodar o Backend

```bash
cd C:\Users\<usuario>\linkedin-prospector\backend
npm install
node server.js
```

Resultado esperado:
```
✅ Servidor LinkedIn Prospector rodando!
📡 Endereço: http://localhost:3000
🔗 Login LinkedIn: http://localhost:3000/auth/linkedin
🌍 Ambiente: development
```

Teste: acesse http://localhost:3000 → deve retornar JSON com os endpoints.

---

## Etapa 5 — Instalar e Rodar o Frontend

Em um **segundo terminal**:

```bash
cd C:\Users\<usuario>\linkedin-prospector\frontend
npm install
npm run dev
```

Resultado esperado:
```
VITE v8.x  ready in 421 ms
➜  Local:   http://localhost:5173/
```

Acesse http://localhost:5173 → deve aparecer a tela de login.

---

## Etapa 6 — Instalar a Extensão Chrome

1. Abra o Chrome e acesse: `chrome://extensions`
2. Ative o **Modo do desenvolvedor** (toggle no canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta: `C:\Users\<usuario>\linkedin-prospector\extension\`
5. A extensão aparece com o ícone **LP** azul

### Fixar na barra
1. Clique no ícone 🧩 na barra do Chrome
2. Clique no alfinete 📌 ao lado de "LinkedIn Prospector — Cromosit IT"

### Configurar o token
Após fazer login em http://localhost:5173:
1. Pressione `F12` → aba **Console**
2. Digite: `localStorage.getItem('token')`
3. Copie o valor (sem aspas)
4. Clique no ícone LP → cole no campo **TOKEN DE ACESSO** → **Salvar token**

---

## Etapa 7 — GitHub (Salvar o Projeto)

### Primeira vez (configuração)
1. Crie conta em https://github.com (gratuito)
2. Crie um repositório: **New repository** → nome: `linkedin-prospector` → **Private** → **Create**
3. Copie a URL do repositório (ex: `https://github.com/seuusuario/linkedin-prospector.git`)
4. Execute na pasta do projeto:
```bash
cd C:\Users\<usuario>\linkedin-prospector
git init
git remote add origin https://github.com/seuusuario/linkedin-prospector.git
git add -A
git commit -m "LinkedIn Prospector v8 - Setup inicial"
git push -u origin main
```

Ou simplesmente execute o `git-configurar.bat` e siga as instruções.

### Salvamentos futuros
```bash
cd C:\Users\<usuario>\linkedin-prospector
git add -A
git commit -m "Descrição do que mudou"
git push
```

Ou clique duas vezes no `git-salvar.bat`.

---

## Uso Diário

### Iniciar o sistema
Clique duas vezes em `8-iniciar-tudo.bat`  
(sobe backend + frontend + abre o Chrome)

### Fluxo de prospecção
1. Acesse http://localhost:5173 → faça login com LinkedIn
2. Abra o LinkedIn no Chrome
3. Busque por cargo/empresa (ex: "Diretor de TI")
4. Clique no ícone LP → **Capturar Todos**
5. No painel, clique **⚡ IA** para enriquecer o lead
6. Clique **✦ IA** para gerar mensagem personalizada
7. Clique **📱 WhatsApp** para enviar via ChatWA

---

## Troubleshooting Rápido

| Problema | Solução Rápida |
|---|---|
| `npm error Missing script` | Verificar se está na pasta `backend\` |
| Porta 3000 ocupada | Executar `6-reiniciar.bat` |
| `permission denied for table` | Ver ERRO-004 no ERRORS_LOG.md |
| Token inválido na extensão | Renovar token via Console: `localStorage.getItem('token')` |
| Extensão não detecta perfis | Recarregar em `chrome://extensions` → 🔄 |
| IA não gera mensagem | Verificar `OPENAI_API_KEY` no `.env` |

Para erros detalhados, consultar: **ERRORS_LOG.md**
