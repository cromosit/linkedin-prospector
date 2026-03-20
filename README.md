# 🔵 LinkedIn Prospector — Cromosit IT

> **Sistema profissional de prospecção de leads no LinkedIn com IA integrada**  
> Versão: 8.0 | Desenvolvido por: Cromosit IT | Curitiba, PR

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)]()
[![Versão](https://img.shields.io/badge/versão-8.0-blue)]()
[![Node](https://img.shields.io/badge/Node.js-18+-green)]()
[![React](https://img.shields.io/badge/React-18-blue)]()

---

## 🎯 O que é este sistema?

O LinkedIn Prospector é um sistema completo de prospecção B2B/B2C que combina:

- **Extensão Chrome** — captura leads diretamente ao navegar no LinkedIn (sem bot, sem risco de ban)
- **IA (OpenAI GPT)** — gera mensagens personalizadas por grau de conexão e perfil do lead
- **CRM Leve** — organiza, classifica e acompanha o pipeline de vendas
- **ChatWA Integration** — envia mensagens via WhatsApp automaticamente

---

## 🏗️ Arquitetura

```
LinkedIn (navegação manual)
        ↓
[Extensão Chrome]  ←  Captura ao visitar perfis / resultados de busca
        ↓
[Backend Node.js]  ←  API REST + OAuth LinkedIn + JWT
        ↓              ↓
[Supabase DB]    [OpenAI GPT]  ←  Geração de mensagens + enriquecimento
        ↓
[Frontend React]  ←  Painel de CRM com barra SAP-style
        ↓
[ChatWA API]  ←  Envio de WhatsApp
        ↓
[Vendedor recebe notificação no WhatsApp]
```

---

## 🚀 Quick Start

### 1. Clone o repositório
```bash
git clone https://github.com/seuusuario/linkedin-prospector.git
cd linkedin-prospector
```

### 2. Configure o backend
```bash
cd backend
cp .env.example .env
# Edite .env com suas chaves (ver SETUP.md)
npm install
node server.js
```

### 3. Configure o frontend
```bash
cd ../frontend
npm install
npm run dev
```

### 4. Instale a extensão Chrome
- Acesse `chrome://extensions`
- Ative **Modo do desenvolvedor**
- Clique em **Carregar sem compactação** → selecione a pasta `extension/`

### 5. Acesse o sistema
- **Painel:** http://localhost:5173
- **API:** http://localhost:3000

📖 Guia completo: ver **[SETUP.md](./SETUP.md)**

---

## 📦 Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express |
| Frontend | React + Vite |
| Banco de Dados | Supabase (PostgreSQL) |
| Autenticação | LinkedIn OAuth + JWT |
| IA | OpenAI GPT-4o-mini |
| WhatsApp | ChatWA API (Cromosit IT) |
| Extensão | Chrome Extension MV3 |

---

## 📁 Estrutura do Projeto

```
linkedin-prospector/
├── backend/               ← API REST (porta 3000)
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js        ← OAuth LinkedIn
│   │   ├── leads.js       ← CRUD + IA + WhatsApp
│   │   └── notify.js      ← Notificações vendedor
│   ├── middleware/
│   │   └── auth.js        ← Validação JWT
│   └── config/
│       ├── supabase.js
│       └── database.sql   ← Schema do banco
├── frontend/              ← Painel React (porta 5173)
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   └── Leads.jsx
│       └── components/
│           └── LeadHistorico.jsx
├── extension/             ← Extensão Chrome
│   ├── manifest.json
│   ├── content.js         ← Lê dados do LinkedIn
│   ├── popup.html
│   └── popup.js
├── SETUP.md               ← Guia de instalação
├── ERRORS_LOG.md          ← Log de erros conhecidos
├── CHANGELOG.md           ← Histórico de versões
├── git-configurar.bat     ← Configura GitHub (1x)
└── git-salvar.bat         ← Salva no GitHub (uso diário)
```

---

## 🔑 Variáveis de Ambiente

Copie `backend/.env.example` para `backend/.env` e preencha:

```env
LINKEDIN_CLIENT_ID=          # LinkedIn Developer Portal → App → Auth
LINKEDIN_CLIENT_SECRET=      # LinkedIn Developer Portal → App → Auth
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
JWT_SECRET=                  # Qualquer string segura
SUPABASE_URL=                # Supabase → Settings → API → Project URL
SUPABASE_KEY=                # Supabase → Settings → API → service_role (não anon!)
OPENAI_API_KEY=              # platform.openai.com → API Keys
CHATWA_API_URL=https://apichatwa.cromosit.com/api/messages
CHATWA_TOKEN=                # Token da instância ChatWA
VENDEDOR_WHATSAPP=           # Número para notificações (5541XXXXXXXXX)
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🗄️ Banco de Dados

### Tabela `leads` — campos principais

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `name` | TEXT | Nome completo |
| `headline` | TEXT | Título/cargo no LinkedIn |
| `company` | TEXT | Empresa atual (da seção Experiência) |
| `location` | TEXT | Localização geográfica |
| `linkedin_url` | TEXT | URL do perfil |
| `linkedin_id` | TEXT | ID único no LinkedIn (único) |
| `phone` | TEXT | Telefone/WhatsApp |
| `email` | TEXT | E-mail |
| `connection_degree` | TEXT | Grau: "1", "2" ou "3" |
| `mutual_connections` | TEXT | Conexões em comum |
| `about` | TEXT | Bio do LinkedIn |
| `service_interest` | TEXT | O que o lead pode precisar (IA) |
| `notes` | TEXT | Dicas estratégicas (IA) |
| `score` | INTEGER | Pontuação 0–100 (IA) |
| `status` | TEXT | novo / contatado / negociando / convertido / descartado |
| `temperature` | TEXT | quente / morno / frio |
| `birthday` | TEXT | Data de aniversário |
| `connected_since` | TEXT | Data de conexão no LinkedIn |
| `created_at` | TIMESTAMPTZ | Data de captura |

---

## 🔌 API Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status do servidor |
| `GET` | `/auth/linkedin` | Inicia OAuth LinkedIn |
| `GET` | `/auth/linkedin/callback` | Callback OAuth |
| `GET` | `/api/leads` | Listar leads (com filtros) |
| `POST` | `/api/leads` | Criar lead |
| `POST` | `/api/leads/bulk` | Importar em massa (extensão) |
| `GET` | `/api/leads/:id` | Detalhes do lead |
| `PUT` | `/api/leads/:id` | Atualizar lead |
| `DELETE` | `/api/leads/:id` | Excluir lead |
| `POST` | `/api/leads/:id/gerar-mensagem` | IA gera mensagem |
| `POST` | `/api/leads/:id/enriquecer` | IA enriquece dados |
| `POST` | `/api/leads/:id/enviar-whatsapp` | Envia via ChatWA |
| `GET` | `/api/leads/stats/dashboard` | Estatísticas |

Todas as rotas `/api/leads` exigem header: `Authorization: Bearer <jwt_token>`

---

## 📊 Funcionalidades por Versão

| Funcionalidade | Status |
|---|---|
| Login com LinkedIn | ✅ Pronto |
| Captura manual (perfil individual) | ✅ Pronto |
| Captura em massa (página de busca) | ✅ Pronto |
| Grau de conexão (1º/2º/3º) | ✅ Pronto |
| Geração de mensagem com IA | ✅ Pronto |
| Envio via WhatsApp (ChatWA) | ✅ Pronto |
| Notificação automática para vendedor | ✅ Pronto |
| Envio no inbox do LinkedIn | ✅ Pronto (1º grau) |
| Histórico de atividades | ✅ Pronto |
| Enriquecimento com IA (score, notas) | ✅ Pronto |
| Botões estilo SAP | ✅ Pronto (v8) |
| Export CSV | 🔄 Em desenvolvimento |
| Relatórios | 🔄 Em desenvolvimento |
| Follow-up automático | 📅 Sprint 3 |
| Integração funil ChatWA | 📅 Aguardando API |
| Deploy produção (Railway+Vercel) | 📅 Sprint 4 |

---

## 🔒 Segurança e Compliance

- **Sem bots:** A extensão só captura dados quando o usuário visita manualmente o perfil
- **JWT:** Todas as rotas da API são protegidas com token de autenticação
- **LGPD:** Dados dos leads armazenados apenas para uso comercial interno
- **LinkedIn ToS:** Sistema usa OAuth oficial + extensão com ação humana (não automatizada)
- **Segredos:** `.env` nunca commitado no repositório (`.gitignore`)

---

## 📚 Documentação

| Arquivo | Conteúdo |
|---|---|
| `SETUP.md` | Guia completo de instalação passo a passo |
| `ERRORS_LOG.md` | 15 erros documentados com causas e soluções |
| `CHANGELOG.md` | Histórico completo de versões v1.0–v8.0 |
| `LinkedIn_Prospector_Blueprint_v7_Cromosit_2026.docx` | Blueprint técnico completo (16 capítulos) |
| `LinkedIn_Prospector_Roadmap_Cromosit_2026.xlsx` | Roadmap com 32 funcionalidades e estimativas |

---

## 🤝 Contribuição

Este é um projeto interno da Cromosit IT. Para contribuir:

1. Crie uma branch: `git checkout -b feature/nome-da-feature`
2. Faça as mudanças e commite: `git commit -m 'feat: descrição'`
3. Push para a branch: `git push origin feature/nome-da-feature`
4. Abra um Pull Request

---

## 📞 Contato

**Cromosit IT** — Curitiba, PR  
Sistema desenvolvido com IA para prospecção LinkedIn

---

*Desenvolvido com 💙 pela equipe Cromosit IT*
