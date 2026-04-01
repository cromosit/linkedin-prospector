# 🔴 Log de Erros — LinkedIn Prospector Cromosit IT

> Atualizado: Março 2026 | v9.0 — Produção

---

## ERRO-001 — npm: Missing script "dev" ✅ RESOLVIDO
**Causa:** Terminal na pasta errada.
**Solução:** `cd C:\Users\samue\02 - linkedin-prospector\backend`

---

## ERRO-002 — supabaseUrl is required ✅ RESOLVIDO
**Causa:** Arquivo `.env` não criado.
**Solução:** Copiar `.env.example` para `.env` e preencher com `service_role` key.

---

## ERRO-003 — EADDRINUSE: address already in use :::3000 ✅ RESOLVIDO
**Causa:** Processo anterior ainda rodando na porta 3000.
**Solução:**
```bash
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %a /F
```
Ou usar `6-reiniciar.bat`.

---

## ERRO-004 — permission denied for table users ✅ RESOLVIDO
**Causa:** RLS ativo + chave `anon` sem permissões.
**Solução:** Usar chave `service_role` + desativar RLS no Supabase.

---

## ERRO-005 — Cannot GET /auth/sucesso ✅ RESOLVIDO
**Causa:** Vite não redirecionava rotas SPA para `index.html`.
**Solução:** Configurar `historyApiFallback` e proxy no `vite.config.js`.

---

## ERRO-006 — Invalid API key (OpenAI) ✅ RESOLVIDO
**Causa:** Chave copiada incorretamente ou saldo insuficiente.
**Solução:** Verificar `OPENAI_API_KEY` no `.env` / Railway Variables.

---

## ERRO-007 — IA gerava mensagens com SAP hardcoded ✅ RESOLVIDO em v9.0
**Causa:** O campo `service_interest` não era injetado no prompt gerador de mensagens.
**Solução:** Re-adicionada a variável dinâmica `service_interest` no motor gerador.
**Resultado testado:** Lead "Software Engineering Manager" → IA gera mensagem sobre Alocação de TI sem mencionar SAP.

---

## ERRO-008 — Extensão não detecta perfis ✅ RESOLVIDO
**Causa:** Seletores CSS do LinkedIn desatualizados.
**Solução:** Usar seletores baseados em `href*="/in/"` (estável).

---

## ERRO-009 — Cannot find module './routes/leads' ✅ RESOLVIDO
**Causa:** Arquivos de rota na pasta errada.
**Solução:** Verificar estrutura — `leads.js`, `notify.js` devem estar em `backend/routes/`.

---

## ERRO-010 — Token JWT inválido na extensão ✅ RESOLVIDO
**Causa:** Token expira após 7 dias.
**Solução em DEV:** Renovar via `localStorage.getItem('token')` no Console.
**Solução em PRD:** Login em https://prospector.cromosit.com/ → copiar token → extensão.

---

## ERRO-011 — Constraint already exists no Supabase ✅ RESOLVIDO
**Causa:** Migration SQL já aplicado anteriormente.
**Solução:** Usar `IF NOT EXISTS` em todos os `ALTER TABLE ADD COLUMN`.

---

## ERRO-012 — Pasta do projeto não encontrada nos BATs ✅ RESOLVIDO
**Causa:** Caminho incorreto nos arquivos `.bat`.
**Caminho correto:** `C:\Users\samue\02 - linkedin-prospector`

---

## ERRO-013 — server.js corrompido ✅ RESOLVIDO
**Causa:** Conteúdo do `.env` colado dentro do `server.js`.
**Solução:** Substituir `server.js` por versão limpa.

---

## ERRO-014 — WhatsApp pedia número manual mesmo com telefone cadastrado ✅ RESOLVIDO em v8.0
**Causa:** `form.phone` não era consultado antes do `prompt()`.
**Solução:** Verificar `leadSel.phone || form.phone` antes de qualquer prompt.

---

## ERRO-015 — Dados de contato não salvos (empresa, email, telefone, cargo) ✅ RESOLVIDO em v9.0
**Causa:** `content.js` não abria o modal "Informações de Contato" do LinkedIn.
**Solução:** Extensão atualizada — abre modal automaticamente, banner verde confirma salvamento.
**Resultado testado:** Campos Cargo Atual e Empresa Atual preenchidos corretamente após captura.

---

## Resumo por Status

| Status | Qtd | Erros |
|---|---|---|
| ✅ Resolvido | 15 | 001–015 |
| 🔴 Aberto | 0 | — |

---

## Checklist antes de reportar novo erro

- [ ] Terminal na pasta correta? `C:\Users\samue\02 - linkedin-prospector`
- [ ] Arquivo `.env` existe e tem `service_role` do Supabase?
- [ ] Backend rodando? (`https://linkedin-prospector-production.up.railway.app/health`)
- [ ] Frontend acessível? (`https://prospector.cromosit.com/`)
- [ ] Extensão recarregada após atualizar arquivos? (`chrome://extensions` → 🔄)
- [ ] Token JWT renovado? (Login em PRD → copiar token → extensão)
- [ ] Arquivos do ZIP colocados nas pastas corretas?

---

*Mantido pela equipe Cromosit IT | Atualizar sempre que novo erro for identificado e resolvido.*
