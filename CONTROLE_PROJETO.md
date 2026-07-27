# 🛸 LinkedIn Prospector — Painel de Controle (Obsidian)

> **Status:** 🟢 Produção / Desenvolvimento Ativo
> **Versão:** 10.0 (Integração ChatWA + Multi-Telas)
> **Última Atualização:** 24/07/2026

---

## 🛠️ Portas e Acessos Locais

| Componente | URL | Porta | Comando |
| :--- | :--- | :--- | :--- |
| **Backend (API)** | [http://localhost:3001](http://localhost:3001) | `3001` | `npm run dev` (em /01_DEV/backend) |
| **Frontend (CRM)** | [http://localhost:5174](http://localhost:5174) | `5174` | `npm run dev` (em /01_DEV/frontend) |
| **Login LinkedIn** | [http://localhost:3001/auth/linkedin](http://localhost:3001/auth/linkedin) | - | - |
| **Health Check** | [http://localhost:3001/health](http://localhost:3001/health) | - | - |

---

## 🌍 Ambiente de Produção

| Componente | URL | Plataforma |
| :--- | :--- | :--- |
| **Frontend (Vercel)** | [https://prospector.cromosit.com/](https://prospector.cromosit.com/) | Vercel |
| **Backend (Railway)** | [https://linkedin-prospector-production.up.railway.app](https://linkedin-prospector-production.up.railway.app) | Railway |
| **Banco de Dados** | [Supabase Dashboard](https://supabase.com/dashboard/project/lquwlzqkcqtepzlxrcmu) | Supabase |
| **LinkedIn Dev** | [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) | LinkedIn |

---

## 📁 Estrutura do Projeto

- `/01_DEV` - Ambiente local de desenvolvimento e testes.
- `/03_PRD` - Espelho do backend em produção.
- `/frontend` (raiz) - Espelho do frontend que a Vercel lê automaticamente.
- `/sincronizar_prd.bat` - Script oficial para promover DEV para Produção.

---

## 📝 Notas de Manutenção

### 🚀 Fluxo de Deploy
Tudo é desenvolvido em `01_DEV`. Quando estiver pronto para Produção:
1. Rode `sincronizar_prd.bat` na raiz do projeto (ele copia as telas pra Vercel e a API pra PRD).
2. Rode `git-salvar.bat` para subir as alterações ao GitHub.
3. Se a Railway travar no Build por causa do `package-lock.json`, rode `01_DEV/fix-dependencias.bat` e suba novamente.

### 🔗 Webhook ChatWA
O Prospector intercepta os eventos do Kanban do ChatWA pela rota de **POST**: `/api/webhooks/chatwa`.

---

## 🎯 Roadmap & Tarefas

- [x] Padronizar portas (3001 para Backend)
- [x] Criar Painel de Controle para Obsidian
- [x] Implementar Relatórios de Funil (Sprint Atual)
- [x] Follow-up Automático (Sprint 5)
- [x] Integração Bidirecional Completa com ChatWA (Sprint 10)
- [ ] Próximo passo a definir...

---
*Cromosit IT — 2026*
