# 🔵 LinkedIn Prospector — Cromosit IT

> **Sistema profissional de prospecção de leads no LinkedIn com IA integrada**
> Versão: 9.0 | Status: **EM PRODUÇÃO** | Cromosit IT — Curitiba, PR

[![Status](https://img.shields.io/badge/status-em%20produção-brightgreen)]()
[![Versão](https://img.shields.io/badge/versão-9.0-blue)]()
[![Frontend](https://img.shields.io/badge/frontend-prospector.cromosit.com-blue)]()
[![Backend](https://img.shields.io/badge/backend-railway.app-purple)]()

---

## 🌐 URLs de Produção

| Componente | URL |
|---|---|
| **Frontend (CRM)** | https://prospector.cromosit.com/ |
| **Backend (API)** | https://linkedin-prospector-production.up.railway.app |
| **Health Check** | https://linkedin-prospector-production.up.railway.app/health |

---

## 🎯 O que é este sistema?

O LinkedIn Prospector é um sistema completo de prospecção B2B/B2C que combina:

- **Extensão Chrome** — captura leads diretamente ao navegar no LinkedIn (email, telefone, cargo, empresa — abre modal de contato automaticamente)
- **IA Dinâmica (OpenAI GPT)** — gera mensagens personalizadas baseadas no `service_interest` real do lead (SAP, TI Outsourcing, Alocação, etc.)
- **CRM com barra SAP-style** — organiza, classifica e acompanha o pipeline
- **ChatWA Integration** — envia mensagens via WhatsApp automaticamente

---

## 🏗️ Arquitetura

```
LinkedIn (navegação manual do SDR)
        ↓
[Extensão Chrome]  ←  Captura perfis + abre modal de contato
        ↓
[Railway — API Node.js]  ←  12 rotas REST + OAuth + JWT
        ↓              ↓
[Supabase DB]    [OpenAI GPT-4o-mini]  ←  Enriquecimento dinâmico
        ↓
[Vercel — Frontend React]  ←  CRM com barra SAP-style
        ↓
[ChatWA API]  ←  Envio WhatsApp para leads
        ↓
[SDR recebe notificação no WhatsApp]
```

---

## 🚀 Acesso ao Sistema

### Para a equipe Cromosit IT
1. Acesse https://prospector.cromosit.com/
2. Clique em **"Entrar com LinkedIn"**
3. Instale a extensão Chrome (pasta `extension/`)
4. Configure o token na extensão após o login

### Para desenvolvimento local
```bash
# Backend
cd "C:\Users\samue\02 - linkedin-prospector\backend"
npm install
node server.js

# Frontend (outro terminal)
cd "C:\Users\samue\02 - linkedin-prospector\frontend"
npm install
npm run dev
```

---

## 📦 Stack Técnica

| Camada | Tecnologia | Ambiente |
|---|---|---|
| Frontend | React 18 + Vite | Vercel |
| Backend | Node.js + Express | Railway |
| Banco de Dados | Supabase (PostgreSQL) | Cloud |
| IA | OpenAI GPT-4o-mini | API |
| WhatsApp | ChatWA API (Cromosit IT) | Cloud |
| Extensão | Chrome MV3 | Navegador local |

---

## 📁 Estrutura do Projeto

```
02 - linkedin-prospector/
├── backend/               ← API REST (Railway — porta dinâmica)
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js        ← OAuth LinkedIn
│   │   ├── leads.js       ← CRUD + IA dinâmica + WhatsApp
│   │   ├── notify.js      ← Notificações vendedor
│   │   └── cadencia.js    ← Cadências de mensagens
│   ├── middleware/
│   │   └── auth.js        ← JWT
│   └── config/
│       ├── supabase.js
│       └── database.sql
├── frontend/              ← CRM React (Vercel)
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   └── Leads.jsx      ← Barra SAP-style
│       └── components/
│           ├── LeadHistorico.jsx
│           └── LeadCadencia.jsx
├── extension/             ← Extensão Chrome (local)
│   ├── manifest.json
│   ├── content.js         ← Captura + modal de contato
│   ├── background.js      ← Aponta para API Railway
│   ├── popup.html
│   └── popup.js
├── README.md
├── CHANGELOG.md
├── ERRORS_LOG.md
├── SETUP.md
├── git-configurar.bat
└── git-salvar.bat
```

---

## 🔌 API Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status do servidor |
| `GET` | `/auth/linkedin` | Inicia OAuth |
| `GET` | `/api/leads` | Listar com filtros + paginação |
| `POST` | `/api/leads` | Criar + enriquecer IA automático |
| `POST` | `/api/leads/bulk` | Importar em massa |
| `GET` | `/api/leads/:id` | Lead + histórico |
| `PUT` | `/api/leads/:id` | Atualizar |
| `DELETE` | `/api/leads/:id` | Excluir |
| `POST` | `/api/leads/:id/gerar-mensagem` | IA gera mensagem (dinâmica) |
| `POST` | `/api/leads/:id/enriquecer` | IA enriquece dados |
| `POST` | `/api/leads/:id/enviar-whatsapp` | Envia via ChatWA |
| `GET` | `/api/leads/stats/dashboard` | Estatísticas |
| `GET/POST` | `/api/cadencias/lead/:id` | Cadências de mensagens |

---

## 📊 Status das Funcionalidades

| Funcionalidade | Status |
|---|---|
| Login com LinkedIn | ✅ PRD |
| Captura individual + contatos automáticos | ✅ PRD |
| Captura em massa | ✅ PRD |
| IA dinâmica (sem SAP hardcoded) | ✅ PRD |
| Enriquecimento automático (score, notas, interesse) | ✅ PRD |
| Envio WhatsApp (número automático) | ✅ PRD |
| Envio inbox LinkedIn (1º grau) | ✅ PRD |
| Histórico de atividades | ✅ PRD |
| Barra SAP-style + paginação | ✅ PRD |
| Export CSV | ✅ PRD |
| Relatórios avançados | 🔄 Sprint Atual |
| Follow-up automático | 📅 Abr/2026 |
| Integração funil ChatWA | 📅 Aguardando API |
| Deploy multi-usuário (SaaS) | 📅 Jul/2026 |

---

## 🔒 Segurança

- JWT protege todas as rotas `/api/*`
- `.env` nunca commitado (`.gitignore`)
- Variáveis de produção configuradas no Railway
- LinkedIn OAuth oficial — sem bots, sem risco de ban
- LGPD: dados usados apenas para prospecção comercial interna

---

## 📚 Documentação

| Arquivo | Conteúdo |
|---|---|
| `SETUP.md` | Guia completo de instalação |
| `ERRORS_LOG.md` | 15 erros documentados e resolvidos |
| `CHANGELOG.md` | Histórico v1.0–v9.0 |
| `Blueprint_v9_PRD.docx` | Blueprint técnico completo (produção) |
| `Roadmap_Cromosit_2026.xlsx` | 32 funcionalidades com estimativas |

---

## 🔄 Deploy

```bash
# Qualquer mudança vai automaticamente para produção:
git add .
git commit -m "descrição da mudança"
git push

# Ou usar:
git-salvar.bat
```

Railway e Vercel fazem o deploy automático em ~2 minutos.

---

*Desenvolvido com IA pela equipe Cromosit IT 💙 | Curitiba, PR*
