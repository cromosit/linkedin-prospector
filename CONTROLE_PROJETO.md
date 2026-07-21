# 🛸 LinkedIn Prospector — Painel de Controle (Obsidian)

> **Status:** 🟢 Desenvolvimento Ativo
> **Versão:** 9.5
> **Última Atualização:** 2026-07-20

---

## 🛠️ Portas e Acessos Locais

| Componente | URL | Porta | Comando |
| :--- | :--- | :--- | :--- |
| **Backend (API)** | [http://localhost:3001](http://localhost:3001) | `3001` | `npm run dev` (em /backend) |
| **Frontend (CRM)** | [http://localhost:5174](http://localhost:5174) | `5174` | `npm run dev` (em /frontend) |
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

- `/01_DEV/backend` - Servidor Node.js + Express
- `/01_DEV/frontend` - Aplicação React + Vite
- `/01_DEV/extension` - Extensão Chrome (MV3)
- `/01_DEV/Doc` - Documentação técnica complementar

---

## 📝 Notas de Manutenção

### 🔑 Como pegar o Token para a Extensão
1. Faça login em `http://localhost:5173`.
2. Abra o Console (F12).
3. Execute: `localStorage.getItem('token')`.
4. Copie o valor e cole no popup da extensão.

### 🔄 Padronização de Portas
- O projeto foi padronizado para usar a porta **3001** no backend para evitar conflitos comuns com a porta 3000 em ambientes Windows.
- O arquivo `.env` e os scripts `.bat` foram atualizados para refletir essa mudança.

---

## 🎯 Roadmap & Tarefas

- [x] Padronizar portas (3001 para Backend)
- [x] Criar Painel de Controle para Obsidian
- [x] Implementar Relatórios de Funil (Sprint Atual)
- [ ] Follow-up Automático (Sprint 5)
- [ ] Integração completa com ChatWA

---
*Cromosit IT — 2026*
