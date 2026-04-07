# Blueprint Completo v9.0 — Em Produção

## Arquitetura · Fluxos · Regras de Negócio · Roadmap · Deploy PRD
**Versão:** 9.0  |  **Data:** Março 2026  |  **Status:** Em Produção  |  **Ambiente:** Railway + Vercel  |  **Autor:** Cromosit IT

**Sistema em produção:** https://prospector.cromosit.com/ | **API:** https://linkedin-prospector-production.up.railway.app
*Este documento é propriedade exclusiva da Cromosit IT. Não reproduzir, distribuir ou compartilhar sem autorização.*

---

## 1. Visão Geral do Produto
### 1.1 O que é o LinkedIn Prospector
O LinkedIn Prospector é o sistema de prospecção automatizada e inteligente da Cromosit IT. Uma plataforma end-to-end que transforma o LinkedIn no principal canal de aquisição de clientes, eliminando o trabalho manual dos SDRs e maximizando a taxa de conversão.

*Status atual: PRODUÇÃO ativa em https://prospector.cromosit.com/ — sistema utilizado pela equipe Cromosit IT para prospecção de leads de Treinamentos SAP, Consultoria e Alocação de TI.*

### 1.2 URLs de Produção
| Componente | URL | Plataforma | Status |
| :--- | :--- | :--- | :--- |
| Frontend (CRM) | https://prospector.cromosit.com/ | Vercel | ✅ Online |
| Backend (API) | https://linkedin-prospector-production.up.railway.app | Railway | ✅ Online |
| Banco de Dados | Supabase — lurxoeggkakikyeoitfv | Supabase | ✅ Online |
| Extensão Chrome | Instalada localmente (MV3) | Chrome | ✅ Ativa |

### 1.3 Arquitetura em Produção
| Camada | Tecnologia | Ambiente PRD | Responsabilidade |
| :--- | :--- | :--- | :--- |
| Frontend | React 18 + Vite | Vercel | CRM, Dashboard, Relatórios |
| Backend | Node.js + Express | Railway | API REST, IA, WhatsApp |
| Banco | PostgreSQL | Supabase | Persistência, histórico, leads |
| IA | OpenAI GPT-4o-mini | API Cloud | Mensagens + enriquecimento dinâmico |
| WhatsApp | ChatWA Cromosit IT | apichatwa.cromosit.com | Envio mensagens + notificações |
| Extensão | Chrome MV3 | Navegador local | Captura LinkedIn + inbox |

---

## 2. Funcionalidades em Produção — v9.0
| Funcionalidade | Status | Observação |
| :--- | :--- | :--- |
| Login com LinkedIn OAuth | ✅ PRD | URL de callback configurada no Railway |
| Captura individual (perfil) | ✅ PRD | Abre modal de contato automaticamente |
| Captura em massa (busca) | ✅ PRD | 24+ perfis por página |
| Empresa da seção Experiência | ✅ PRD | Corrigido — não usa mais headline |
| Localização geográfica correta | ✅ PRD | Filtra nomes de pessoas |
| Email e telefone do modal de contato | ✅ PRD | Banner verde confirma salvamento |
| Grau de conexão (1º/2º/3º) | ✅ PRD | Temperatura automática |
| Enriquecimento IA dinâmico | ✅ PRD | service_interest determina o contexto |
| Mensagem IA sem SAP hardcoded | ✅ PRD | Adapta para SAP, TI Outsourcing, etc. |
| 5 tipos de mensagem IA | ✅ PRD | Conexão, Com Comum, 1º Contato, Follow-up, WhatsApp |
| Envio WhatsApp via ChatWA | ✅ PRD | Usa telefone do cadastro automaticamente |
| Envio inbox LinkedIn (1º grau) | ✅ PRD | Extensão clica e insere texto |
| Histórico de atividades | ✅ PRD | Timeline por lead |
| Barra de ações SAP-style | ✅ PRD | Toolbar profissional no CRM |
| Paginação (20 leads/página) | ✅ PRD | Navegação completa |
| Export CSV | ✅ PRD | Download com todos os campos |
| Score de lead (0-100) | ✅ PRD | Calculado pela IA no enriquecimento |
| Notificação WhatsApp ao vendedor | ✅ PRD | Ao capturar leads em massa |
| Cadência de mensagens | 🔄 Em dev | Estrutura criada, ativação pendente |
| Relatórios avançados | 🔄 Em dev | Sprint 2 |
| Follow-up automático | 📅 Sprint 2 | Dia 0/3/7/14 |
| Integração funil ChatWA | 📅 Aguardando API | Endpoints em desenvolvimento |
| Deploy multi-usuário | 📅 Sprint 4 | Para versão SaaS |

---

## 3. IA Dinâmica — Como Funciona
### 3.1 Fluxo de Enriquecimento (2 etapas)
O sistema usa IA em duas etapas distintas para garantir mensagens precisas e sem contexto incorreto:

| Etapa | O que faz | Input | Output |
| :--- | :--- | :--- | :--- |
| 1 — Enriquecimento | Analisa o perfil e identifica o que o lead precisa | cargo, empresa, bio, grau | service_interest, notes, score |
| 2 — Geração da mensagem | Cria mensagem usando o service_interest como contexto | service_interest + tipo + perfil | Mensagem personalizada e alinhada |

*Exemplo real:* Lead com cargo 'Software Engineering Manager' → IA identifica service_interest = 'Alocação de desenvolvedores e squads ágeis' → Mensagem gerada foca em TI Outsourcing, sem mencionar SAP.

### 3.2 Regra do Prompt Dinâmico
O campo `service_interest` é injetado diretamente no prompt gerador.
- **Preenchido:** usa exatamente o que a IA de enriquecimento identificou.
- **Vazio:** usa contexto padrão 'Treinamentos SAP, Consultoria e Alocação de TI Cromosit IT'.
- **SDR** pode editar manualmente o `service_interest` antes de gerar a mensagem.

---

## 4. Regras de Negócio
### 4.1 Temperatura por Grau de Conexão
| Temperatura | Grau | Mensagem Padrão | Canal Recomendado |
| :--- | :--- | :--- | :--- |
| 🔥 Quente | 1º Grau (conectados) | primeiro_contato | WhatsApp ou inbox LinkedIn |
| ⚡ Morno | 2º Grau (amigos de amigos) | conexao_com_comum | Pedido de conexão mencionando comum |
| ❄️ Frio | 3º Grau+ (sem conexão) | conexao | Mensagem curta, sem pitch |

### 4.2 Score de Lead — Critérios IA
| Critério | Pontuação | Justificativa |
| :--- | :--- | :--- |
| Cargo estratégico (CIO/CTO/Head/Diretor/Manager) | +30 | Poder de decisão |
| Empresa com SAP ou TI estruturada | +20 | Demanda real identificada |
| 1º grau de conexão | +20 | Relacionamento facilitado |
| Setor relevante (manufatura/tech/financeiro) | +15 | Alta adoção de TI |
| Localização Brasil | +10 | Mercado-alvo principal |
| Sem informações de empresa/cargo | -10 | Perfil incompleto |

### 4.3 Ciclo de Status
| Status | Quando | Gatilho |
| :--- | :--- | :--- |
| Novo | Capturado, não contatado | Automático ao salvar |
| Contatado | Mensagem enviada | Automático ao enviar WhatsApp |
| Respondeu | Lead respondeu | Manual — SDR atualiza |
| Em negociação | Proposta enviada | Manual — SDR atualiza |
| Fechado | Contrato assinado | Manual — SDR atualiza |
| Descartado | Sem fit / sem resposta | Manual ou automático (Sprint 2) |

---

## 5. Deploy e Infraestrutura
### 5.1 Configuração de Produção
| Variável de Ambiente | Valor PRD | Onde configurar |
| :--- | :--- | :--- |
| FRONTEND_URL | https://prospector.cromosit.com | Railway → Variables |
| LINKEDIN_REDIRECT_URI | https://linkedin-prospector-production.up.railway.app/auth/linkedin/callback | Railway + LinkedIn Dev Portal |
| NODE_ENV | production | Railway → Variables |
| PORT | (Railway define automaticamente) | Automático |
| SUPABASE_URL | https://lurxoeggkakikyeoitfv.supabase.co | Railway → Variables |
| SUPABASE_KEY | service_role key | Railway → Variables (secreto) |
| OPENAI_API_KEY | sk-proj-... | Railway → Variables (secreto) |
| CHATWA_TOKEN | HiYooAHPQI66uey1HJj0YWkYPq6BWyIB | Railway → Variables |
| VENDEDOR_WHATSAPP | 5541991719998 | Railway → Variables |
| JWT_SECRET | cromosit-prospector-chave-secreta-2024 | Railway → Variables (secreto) |

### 5.2 Deploy Contínuo
- **Backend:** Railway — deploy automático a cada `git push` para `main`
- **Frontend:** Vercel — deploy automático a cada `git push` para `main`
- **Banco:** Supabase — sempre online, sem deploy necessário
- **Extensão:** instalação manual no Chrome (não vai para stores)

*Fluxo de deploy:* `git push` → Railway/Vercel detecta → build automático → deploy em ~2 minutos. Extensão precisa ser recarregada manualmente em `chrome://extensions` após atualizações.

---

## 6. Fluxos Principais
### 6.1 Fluxo Completo de Prospecção
| Passo | Ação | Responsável | Sistema |
| :--- | :--- | :--- | :--- |
| 1 | SDR acessa sistema e faz login com LinkedIn | SDR | Vercel + Railway OAuth |
| 2 | SDR busca no LinkedIn por cargo/empresa | SDR | LinkedIn.com |
| 3 | Extensão detecta resultados e mostra X perfis | Automático | Chrome Extension |
| 4 | SDR clica 'Capturar Todos' — tenta abrir contatos | SDR + Auto | Extension → Railway API |
| 5 | Banner verde confirma dados salvos | Automático | Supabase |
| 6 | IA enriquece: service_interest, notes, score | Automático | GPT-4o-mini |
| 7 | SDR acessa painel, filtra por temperatura | SDR | Frontend React |
| 8 | SDR clica ✦ IA, escolhe tipo, revisa e aprova | SDR | GPT-4o-mini |
| 9 | SDR clica 📱 WhatsApp — enviada via ChatWA | SDR | ChatWA API |
| 10 | Status atualiza para 'Contatado', atividade registrada | Automático | Supabase |

---

## 7. Roadmap — Próximas Entregas
| Fase | Sprint | Prazo | Entrega | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1.5 | Sprint Atual | Mar/2026 | Relatórios básicos (funil, origem, período) | 🔄 Em dev |
| 2 | Sprint 2 | Abr/2026 | Follow-up automático Dia 0/3/7/14 + pausa automática | 📅 Planejado |
| 2 | Sprint 2 | Abr/2026 | Integração funil ChatWA (criar contato + negócio) | ⏳ Aguarda API |
| 2 | Sprint 2 | Abr/2026 | Cadência de mensagens ativada no painel | 📅 Planejado |
| 3 | Sprint 3 | Mai/2026 | Playwright — envio automático de conexão LinkedIn | 📅 Planejado |
| 4 | Sprint 4 | Jun/2026 | Score IA avançado + detecção vagas SAP (go-live) | 📅 Planejado |
| 5 | Sprint 5 | Jul/2026 | Multi-usuário + planos SaaS + white-label parceiros | 📅 Planejado |

### 7.1 KPIs de Sucesso — Produção
| KPI | Meta 3 meses | Meta 6 meses | Como medir |
| :--- | :--- | :--- | :--- |
| Leads capturados/mês | 500 | 1.500 | Dashboard → Total de Leads |
| Taxa de contato | 80% | 90% | Pipeline → Contatados / Total |
| Taxa de resposta | 10% | 20% | Pipeline → Respondeu / Contatados |
| Contratos fechados | 3 | 10 | Status = Fechado |
| Receita via LinkedIn | R$ 15k | R$ 75k | Contratos assinados |
| Clientes SaaS | 0 | 5 | Após lançamento Jul/2026 |

---

## 8. Changelog Completo
**v9.0 — Março 2026 — PRODUÇÃO**
- Deploy frontend: https://prospector.cromosit.com/ (Vercel)
- Deploy backend: https://linkedin-prospector-production.up.railway.app (Railway)
- IA 100% dinâmica: prompt usa service_interest — sem SAP hardcoded
- Captura automática de contatos: banner verde confirma email, telefone, cargo, empresa
- Localização correta: filtra nomes próprios, captura apenas locais geográficos reais
- Empresa da seção Experiência: corrigido definitivamente (ERRO-015 fechado)
- Mensagem alinhada ao serviço real: TI Outsourcing, SAP, Alocação — sem forçar SAP

**v8.0 — Março 2026**
- ... (detalhes legados omitidos)
