# 📋 Changelog — LinkedIn Prospector Cromosit IT

Todas as mudanças significativas do projeto são documentadas aqui.

---

## [v9.0] — Março 2026 — 🚀 PRODUÇÃO

### Deploy
- **Frontend:** https://prospector.cromosit.com/ (Vercel)
- **Backend API:** https://linkedin-prospector-production.up.railway.app (Railway)
- **Deploy contínuo:** git push → build automático → online em ~2 min

### Adicionado
- Sistema em produção — acessível pela equipe Cromosit IT
- IA 100% dinâmica: `service_interest` determina o contexto da mensagem
- Captura automática de contatos: banner verde confirma email, telefone, cargo, empresa
- Empresa correta: extraída da seção Experiência do LinkedIn
- Localização correta: filtra nomes próprios, captura locais geográficos reais
- Mensagem alinhada ao serviço real do lead (TI Outsourcing, SAP, Alocação, etc.)
- `background.js` da extensão apontando para API Railway em produção

### Corrigido (definitivo)
- **ERRO-007:** prompt da IA não usava `service_interest` — corrigido e testado
- **ERRO-015:** dados de contato não capturados (empresa, cargo, telefone, email) — corrigido

---

## [v8.0] — Março 2026

### Adicionado
- Barra de ações no estilo SAP Easy Access no painel de leads
- Botões visuais de grau de conexão (🟢 1º / 🔵 2º / ⚪ 3º)
- Campo "🎯 O que este lead precisa?" com preenchimento por IA
- Destaque visual azul para campos preenchidos pela extensão
- Botão WhatsApp exibe o número: `📱 WhatsApp (5541...)`
- Input inline para telefone quando lead não tem número (sem `alert()`)
- Paginação completa (20 leads por página)
- Score com cores: 🟢 ≥70 · 🟠 ≥40 · ⚪ <40
- Alerta visual `⚠ Sem telefone` na tabela de leads
- Botão 🔄 Cadência por lead (estrutura backend + frontend)
- `LeadHistorico.jsx` corrigido e funcionando com timeline real
- `LeadCadencia.jsx` — painel completo de cadências

### Corrigido
- WhatsApp não usava o telefone do cadastro automaticamente
- Modal sem barra de ações profissional
- LeadHistorico não passava props corretas (leadNome faltava)

---

## [v7.0] — Março 2026

### Adicionado
- IA preenche automaticamente `service_interest`, `notes` e `score`
- Rota `POST /api/leads/:id/enriquecer`
- Botão ⚡ na tabela para enriquecer qualquer lead
- Sistema GitHub com `git-salvar.bat` e `git-configurar.bat`

### Corrigido
- Empresa da seção Experiência (não da headline)
- Localização filtrada para remover nomes próprios
- WhatsApp sem `prompt()` quando lead tem telefone

---

## [v6.0] — Março 2026

### Adicionado
- Histórico de atividades por lead (`LeadHistorico.jsx`)
- Envio de mensagem no inbox do LinkedIn (extensão + 1º grau)

---

## [v5.0] — Março 2026

### Adicionado
- 5 tipos de mensagem IA com regeneração
- Rota DELETE `/api/leads/:id`
- Botões Editar / IA / LinkedIn / Excluir na tabela
- Campos `birthday`, `connected_since`, `service_interest`, `score`

---

## [v4.0] — Março 2026

### Adicionado
- Captura em massa da página de resultados LinkedIn
- Notificação automática WhatsApp ao vendedor (`notify.js`)
- Campos `connection_degree`, `mutual_connections`, `followers`, `website`, `about`

---

## [v3.0] — Março 2026

### Adicionado
- Integração ChatWA para envio de WhatsApp
- Rota `POST /api/leads/:id/enviar-whatsapp`

### Alterado
- API de IA: Anthropic → OpenAI GPT-4o-mini

---

## [v2.0] — Março 2026

### Adicionado
- Frontend React completo (Login, Dashboard, Leads)
- Extensão Chrome v1 — captura de perfil individual
- Arquivos `.bat` para automação (1 a 8)

---

## [v1.0] — Fevereiro 2026

### Adicionado
- Backend Node.js + Express (porta 3000)
- LinkedIn OAuth 2.0 + OpenID Connect
- Supabase — 3 tabelas: `users`, `leads`, `lead_activities`
- 8 endpoints REST + JWT

---

## Próximas Versões

### [v9.5] — Sprint Atual
- [ ] Relatórios básicos (funil, origem, performance por período)
- [ ] Dashboard com filtro por período

### [v10.0] — Sprint 2 (Abr/2026)
- [ ] Follow-up automático Dia 0/3/7/14
- [ ] Integração funil ChatWA (criar contato + negócio)
- [ ] Cadência de mensagens ativa no painel

### [v11.0] — Sprint 3 (Mai/2026)
- [ ] Playwright — envio automático de conexão LinkedIn

### [v12.0+] — SaaS
- [ ] Multi-usuário, planos, white-label para parceiros SAP
