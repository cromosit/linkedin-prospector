# 📋 Changelog — LinkedIn Prospector Cromosit IT

Todas as mudanças significativas do projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [v8.0] — 19/03/2026

### Adicionado
- Barra de ações no estilo SAP Easy Access no painel de leads
- Botões visuais de grau de conexão (🟢 1º / 🔵 2º / ⚪ 3º) no formulário
- Campo "🎯 O que este lead precisa?" com preenchimento por IA
- Destaque visual azul para campos preenchidos pela extensão
- Botão WhatsApp exibe o número diretamente: `📱 WhatsApp (5541...)`
- Input inline para telefone quando lead não tem número (sem `alert()` nativo)
- Paginação completa (20 leads por página)
- Score com cores: 🟢 ≥70 · 🟠 ≥40 · ⚪ <40

### Corrigido
- WhatsApp não usava o telefone do cadastro automaticamente
- Modal sem barra de ações profissional
- Empresa, email e telefone não apareciam corretamente nos campos

---

## [v7.0] — 19/03/2026

### Adicionado
- IA preenche automaticamente `service_interest`, `notes` e `score` ao capturar leads
- Nova rota `POST /api/leads/:id/enriquecer` para enriquecimento manual com IA
- Botão ⚡ na tabela de leads para enriquecer qualquer lead a qualquer momento
- Campo `service_interest`: análise automática do que o lead pode precisar
- Campo `notes`: dicas estratégicas com bullet points gerados pela IA

### Corrigido
- Empresa agora vem da seção **Experiência** do LinkedIn (não da headline)
- Localização filtrada para remover nomes próprios (ex: "Jacinto" não é uma cidade)
- Tentativa automática de abrir modal "Informações de Contato" para capturar telefone/email
- WhatsApp sem `prompt()` desnecessário quando lead tem telefone

---

## [v6.0] — 19/03/2026

### Adicionado
- Histórico de atividades por lead (`LeadHistorico.jsx`)
  - Timeline: mensagens geradas, WhatsApp enviado, lead capturado, notas manuais
  - Campo para registrar atividades manuais (nota, ligação, reunião)
- Envio de mensagem diretamente no inbox do LinkedIn via extensão
  - Detecta se é 1º grau (conexão direta) e exibe botão "✉ Enviar no LinkedIn"
  - Extensão clica no botão "Mensagem" do perfil e preenche o texto automaticamente
  - Usuário revisa e confirma — não é bot

### Alterado
- `popup.js` e `popup.html` completamente reescritos para interface v6

---

## [v5.0] — 19/03/2026

### Adicionado
- Análise de brechas de mercado (10 brechas identificadas)
- Arquivo `git-configurar.bat` para setup automático do GitHub
- Arquivo `git-salvar.bat` para commits com 1 clique
- Arquivo `.gitignore` protegendo `.env`, `node_modules`, etc.
- Blueprint v5 com documentação completa (16 capítulos)
- README.md para o repositório GitHub

### Adicionado ao banco de dados
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS connected_since TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS service_interest TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
```

### Corrigido
- Botões de nível (1º/2º/3º grau) adicionados ao formulário do lead
- Modal do lead com todos os campos organizados
- Botões: Editar / IA / LinkedIn / Excluir na tabela

---

## [v4.0] — 19/03/2026

### Adicionado
- Captura em massa de leads da página de resultados do LinkedIn
  - Detecta automaticamente que é uma página de busca
  - Lista todos os perfis com grau de conexão (🟢1º 🔵2º ⚪3º)
  - Captura todos os perfis de uma página com 1 clique
- Rota de notificação automática para o vendedor no WhatsApp (`notify.js`)
  - Ao capturar leads, envia resumo para `VENDEDOR_WHATSAPP`
- Suporte a campos: `connection_degree`, `mutual_connections`, `followers`, `website`, `about`, `can_connect`

### Adicionado ao banco de dados
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS connection_degree TEXT DEFAULT '3';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mutual_connections TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followers TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS can_connect BOOLEAN DEFAULT true;
```

### Corrigido
- Seletores da extensão reescritos para usar estrutura de URL (`href*="/in/"`) em vez de classes CSS instáveis

---

## [v3.0] — 19/03/2026

### Adicionado
- Integração com ChatWA da Cromosit IT
  - Rota `POST /api/leads/:id/enviar-whatsapp`
  - Envia mensagem gerada pela IA diretamente para o WhatsApp do lead
- Configuração no `.env`: `CHATWA_TOKEN`, `CHATWA_API_URL`

### Alterado
- API de IA migrada de Anthropic (Claude) para OpenAI (GPT) por problemas de saldo
- Variável de ambiente: `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`

### Corrigido
- Bug crítico: `lead.lead` → `lead.company` no prompt da IA (causava erro 400)
- Modelo da API atualizado para versão compatível
- `server.js` corrigido após corrupção acidental

---

## [v2.0] — 19/03/2026

### Adicionado
- Frontend React completo com Vite
  - Tela de Login com botão "Entrar com LinkedIn"
  - Dashboard com estatísticas e gráficos de pipeline
  - Tela de Leads com filtros, busca e status
  - Modal de lead com formulário completo
  - Geração de mensagem com IA (5 tipos: Conexão, 2º Grau, 1º Contato, Follow-up, WhatsApp)
- Extensão Chrome (versão inicial)
  - Detecta perfil ao visitar manualmente
  - Captura: nome, cargo, empresa, localização, URL do LinkedIn
  - Popup com botão "+ Capturar Lead"
- Arquivos `.bat` para automação (1-instalar até 8-iniciar-tudo)
- Frontend rodando na porta 5173

### Corrigido
- Configuração do `vite.config.js` para proxy do backend
- Erro `Cannot GET /auth/sucesso` após login LinkedIn

---

## [v1.0] — 18/03/2026

### Adicionado
- Backend Node.js com Express (porta 3000)
- Autenticação OAuth com LinkedIn (Sign In with OpenID Connect)
- Banco de dados Supabase com 3 tabelas: `users`, `leads`, `lead_activities`
- 8 endpoints REST para gestão de leads:
  - `GET /api/leads` — listar com filtros
  - `POST /api/leads` — criar lead
  - `POST /api/leads/bulk` — importar em massa
  - `GET /api/leads/:id` — detalhes do lead
  - `PUT /api/leads/:id` — atualizar
  - `DELETE /api/leads/:id` — excluir
  - `POST /api/leads/:id/gerar-mensagem` — IA gera mensagem
  - `GET /api/leads/stats/dashboard` — estatísticas
- JWT para autenticação de todas as rotas de leads
- Middleware de autenticação

### Infraestrutura
- Supabase configurado com RLS desativado e permissões corretas
- Arquivo `.env.example` com todas as variáveis necessárias
- `package.json` com scripts `dev` (nodemon) e `start` (produção)

---

## Próximas Versões Planejadas

### [v9.0] — Previsto: Sprint 2 (Semana 2 de Abril/2026)
- [ ] Botão Refresh no Dashboard e na tela de Leads
- [ ] Export CSV dos leads
- [ ] Paginação real no Dashboard
- [ ] Filtros por período (hoje / 7 dias / 30 dias)
- [ ] Seleção múltipla + ações em massa na tabela

### [v10.0] — Previsto: Sprint 3
- [ ] Relatório: Taxa de Conversão por Grau de Conexão
- [ ] Relatório: Leads por Cargo/Empresa
- [ ] Relatório: Performance do Funil
- [ ] Dashboard de KPIs em tempo real

### [v11.0] — Integração ChatWA (quando API estiver disponível)
- [ ] `POST /api/chatwa/criar-contato`
- [ ] `POST /api/chatwa/criar-negocio`
- [ ] Lead capturado → entra automaticamente no funil LinkedIn Prospector do ChatWA
- [ ] Etapas: Novo Lead → Contatado → Proposta → Negociando → Fechado

### [v12.0] — Follow-up Automático
- [ ] Sequência automática por grau de conexão
- [ ] Dia 0: mensagem de conexão
- [ ] Dia 3: follow-up 1 (sem resposta)
- [ ] Dia 7: follow-up 2 via WhatsApp
- [ ] Dia 14: descarte automático
- [ ] Pausa automática quando lead responde

### [v13.0 em diante] — SaaS / Produção
- [ ] Deploy Railway (backend) + Vercel (frontend)
- [ ] Multi-tenant (múltiplos clientes)
- [ ] Planos: Free / Pro / Enterprise
- [ ] Onboarding guiado para novos clientes
