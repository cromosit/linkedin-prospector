# 🔴 Log de Erros — LinkedIn Prospector Cromosit IT

> Documento criado em: 20/03/2026  
> Objetivo: Registrar todos os erros encontrados durante o desenvolvimento para evitar reincidência.

---

## ERRO-001 — npm: Missing script "dev"

**Data:** 18/03/2026  
**Categoria:** Ambiente / Terminal  
**Severidade:** Baixa

### Sintoma
```
npm error Missing script: "dev"
```

### Causa
Terminal estava na pasta errada (`C:\Users\samue` em vez de `C:\Users\samue\linkedin-prospector`).

### Solução
```bash
cd C:\Users\samue\linkedin-prospector
npm run dev
```

### Prevenção
- Sempre verificar o caminho no terminal antes de rodar comandos npm.
- Usar o arquivo `2-rodar.bat` que já entra na pasta correta automaticamente.

---

## ERRO-002 — supabaseUrl is required

**Data:** 18/03/2026  
**Categoria:** Configuração / Ambiente  
**Severidade:** Alta

### Sintoma
```
Error: supabaseUrl is required.
at validateSupabaseUrl
```

### Causa
Arquivo `.env` não havia sido criado. Apenas existia o `.env.example`.

### Solução
1. Copiar `.env.example` para `.env`
2. Preencher com valores reais:
```env
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGci...
```

### Prevenção
- O arquivo `4-editar-configuracoes.bat` cria e abre o `.env` automaticamente.
- NUNCA commitar o `.env` no Git (já está no `.gitignore`).

---

## ERRO-003 — EADDRINUSE: address already in use :::3000

**Data:** 18/03/2026 (recorrente)  
**Categoria:** Ambiente / Processo  
**Severidade:** Média

### Sintoma
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Causa
Processo anterior do servidor ainda em execução na porta 3000. Ocorre quando o servidor é fechado abruptamente ou dois terminais tentam subir o backend simultaneamente.

### Solução
```bash
# Encontrar o processo
netstat -ano | findstr :3000 | findstr LISTENING

# Matar pelo PID (substitua 12345 pelo número real)
taskkill /PID 12345 /F

# Ou usar o bat criado:
6-reiniciar.bat
```

### Prevenção
- Usar apenas o `8-iniciar-tudo.bat` para iniciar o sistema (fecha processos anteriores automaticamente).
- Nunca abrir dois terminais rodando o backend simultaneamente.

---

## ERRO-004 — permission denied for table users

**Data:** 18/03/2026  
**Categoria:** Banco de Dados / Supabase  
**Severidade:** Alta

### Sintoma
```
Erro no callback LinkedIn: permission denied for table users
```

### Causa
Row Level Security (RLS) do Supabase bloqueando acesso + chave `anon` sem permissões suficientes.

### Solução
Execute no Supabase → SQL Editor:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities DISABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

Substituir no `.env`:
```env
# Usar service_role (não a anon key)
SUPABASE_KEY=sb_secret_...
```

### Prevenção
- Sempre usar a chave `service_role` no backend (não a `anon`).
- A `service_role` fica em: Supabase → Settings → API → Service Role Key.

---

## ERRO-005 — Cannot GET /auth/sucesso

**Data:** 18/03/2026  
**Categoria:** Frontend / Roteamento  
**Severidade:** Média

### Sintoma
```
Cannot GET /auth/sucesso
```

### Causa
Vite não estava configurado para redirecionar todas as rotas para o `index.html` (necessário para SPAs com React Router).

### Solução
Atualizar `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000'
    }
  }
})
```

### Prevenção
- Sempre configurar o proxy do Vite no início do projeto.
- O arquivo `vite.config.js` do projeto já inclui essa configuração.

---

## ERRO-006 — Invalid API key (Anthropic / OpenAI)

**Data:** 19/03/2026  
**Categoria:** Integração IA  
**Severidade:** Alta

### Sintoma
```
Erro ao gerar mensagem: Request failed with status code 401
Erro ao gerar mensagem: Request failed with status code 400
```

### Causa (múltiplas)
- Chave da API copiada incorretamente (com espaços ou incompleta).
- Saldo insuficiente na Anthropic (`credit balance too low`).
- Nome do modelo desatualizado (`claude-sonnet-4-20250514` não existia).

### Solução
No `.env`:
```env
# OpenAI (solução adotada)
OPENAI_API_KEY=sk-proj-...

# Ou Anthropic (requer créditos)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

No `routes/leads.js`:
```javascript
// Modelo correto atual
model: 'gpt-4o-mini'
// Ou para Anthropic:
model: 'claude-haiku-4-5-20251001'
```

### Prevenção
- Verificar saldo antes de usar a API Anthropic.
- Manter o modelo atualizado conforme documentação oficial.
- Nunca copiar a chave com espaços ou quebras de linha.

---

## ERRO-007 — lead.lead (campo undefined no prompt da IA)

**Data:** 19/03/2026  
**Categoria:** Bug de Código  
**Severidade:** Alta

### Sintoma
```
Request failed with status code 400
{ type: 'invalid_request_error', message: '...' }
```

### Causa
No arquivo `routes/leads.js`, o prompt enviado para a IA tinha `lead.lead` em vez de `lead.company`:
```javascript
// ERRADO:
- Empresa: ${lead.lead || 'não informada'}

// CORRETO:
- Empresa: ${lead.company || 'não informada'}
```

### Solução
Corrigir o campo no arquivo `routes/leads.js` — ver versão v5+.

### Prevenção
- Sempre revisar os campos do objeto `lead` antes de montar prompts.
- Campos disponíveis: `name`, `headline`, `company`, `location`, `linkedin_url`, `phone`, `email`, `about`, `connection_degree`.

---

## ERRO-008 — Extensão Chrome não detecta perfis (seletores desatualizados)

**Data:** 19/03/2026  
**Categoria:** Extensão Chrome  
**Severidade:** Alta

### Sintoma
Popup da extensão mostra "Nenhum lead selecionado" ou "0 perfis encontrados" mesmo estando em uma página de resultados do LinkedIn.

### Causa
O LinkedIn atualiza frequentemente o HTML/CSS das suas páginas. Seletores baseados em classes CSS (`.entity-result__title`, etc.) param de funcionar.

### Solução
Usar seletores baseados em estrutura de URL, que são mais estáveis:
```javascript
// FRÁGIL (evitar):
document.querySelectorAll('.entity-result__title-text')

// ROBUSTO (usar):
const cards = document.querySelectorAll('li');
const comLink = Array.from(cards).filter(li => li.querySelector('a[href*="/in/"]'));
```

### Prevenção
- Priorizar seletores por atributos semânticos (`href`, `aria-label`) em vez de classes CSS.
- Ao atualizar a extensão, recarregar em `chrome://extensions` → botão 🔄.
- Se parar de funcionar: remover e reinstalar a extensão do zero (limpa o cache).

---

## ERRO-009 — Cannot find module './routes/leads' (ou notify)

**Data:** 19/03/2026  
**Categoria:** Backend / Estrutura de Arquivos  
**Severidade:** Alta

### Sintoma
```
Error: Cannot find module './routes/leads'
Error: Cannot find module './routes/notify'
```

### Causa
Arquivos `.js` das rotas não estavam na pasta `backend/routes/` — ou foram colocados na pasta errada, ou o `server.js` referenciava caminhos incorretos.

### Solução
Verificar estrutura de pastas:
```
linkedin-prospector/
└── backend/
    ├── server.js
    ├── package.json
    ├── routes/
    │   ├── auth.js       ← deve existir aqui
    │   ├── leads.js      ← deve existir aqui
    │   └── notify.js     ← deve existir aqui
    ├── middleware/
    │   └── auth.js
    └── config/
        ├── supabase.js
        └── database.sql
```

### Prevenção
- Ao receber novos arquivos ZIP, verificar o destino de cada arquivo antes de extrair.
- Consultar a tabela "Onde colocar cada arquivo" na documentação de cada versão.

---

## ERRO-010 — Token JWT inválido na extensão Chrome

**Data:** 19/03/2026  
**Categoria:** Autenticação / Extensão  
**Severidade:** Média

### Sintoma
```
❌ Erro: Invalid API key
```
(na extensão Chrome ao tentar capturar leads)

### Causa
O token JWT expira após 7 dias. O token salvo na extensão é de uma sessão anterior.

### Solução
1. Acessar `http://localhost:5173` e fazer login
2. Pressionar `F12` → aba **Console**
3. Digitar: `localStorage.getItem('token')`
4. Copiar o valor retornado (sem aspas)
5. Colar no campo **TOKEN DE ACESSO** da extensão → **Salvar token**

### Prevenção
- Renovar o token sempre que o sistema ficar inativo por mais de 7 dias.
- Futuramente: implementar refresh token automático.

---

## ERRO-011 — Constraint already exists no Supabase

**Data:** 19/03/2026  
**Categoria:** Banco de Dados  
**Severidade:** Baixa

### Sintoma
```
ERROR: 42P07: relation "leads_linkedin_id_unique" already exists
```

### Causa
Tentativa de rodar um migration SQL que já havia sido aplicado anteriormente.

### Solução
Rodar apenas as partes novas do SQL, removendo as linhas que já foram executadas. Usar `IF NOT EXISTS` sempre que possível:
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS connected_since TEXT;
```

### Prevenção
- Sempre usar `IF NOT EXISTS` em `ALTER TABLE ADD COLUMN`.
- Usar `CREATE TABLE IF NOT EXISTS` ao criar tabelas.
- Manter histórico de quais migrations já foram aplicadas.

---

## ERRO-012 — Frontend Vite não encontra pasta do projeto

**Data:** 19/03/2026  
**Categoria:** Ambiente / Estrutura de Pastas  
**Severidade:** Média

### Sintoma
```
O sistema não pode encontrar o caminho especificado.
```
(ao rodar os arquivos `.bat`)

### Causa
A pasta `linkedin-prospector-frontend` não existia — o frontend foi criado em `linkedin-prospector/frontend/` (subpasta), mas os `.bat` buscavam em outro local.

### Solução
Estrutura correta do projeto:
```
C:\Users\samue\linkedin-prospector\
├── backend\        ← servidor Node.js (porta 3000)
├── frontend\       ← React/Vite (porta 5173)
└── extension\      ← Extensão Chrome
```

Os `.bat` devem apontar para:
```batch
cd /d C:\Users\samue\linkedin-prospector\backend
cd /d C:\Users\samue\linkedin-prospector\frontend
```

### Prevenção
- Manter a estrutura de pastas padronizada (backend, frontend, extension dentro de `linkedin-prospector`).
- Sempre verificar os caminhos nos arquivos `.bat` antes de executar.

---

## ERRO-013 — server.js com conteúdo do .env misturado

**Data:** 19/03/2026  
**Categoria:** Bug de Código / Usuário  
**Severidade:** Crítica

### Sintoma
```
TypeError: "" is not a function
at Object.<anonymous> (server.js:42:3)
```

### Causa
Conteúdo das instruções do `.env` foi colado dentro do arquivo `server.js` por engano, corrompendo o JavaScript.

### Solução
Substituir o `server.js` por uma versão limpa. O conteúdo do `.env` deve ficar SOMENTE no arquivo `.env`.

### Prevenção
- O arquivo `.env` fica em `backend/.env`.
- O arquivo `server.js` fica em `backend/server.js`.
- São arquivos completamente separados — nunca misturar.

---

## ERRO-014 — WhatsApp com prompt manual desnecessário

**Data:** 19/03/2026  
**Categoria:** Bug de UX / Frontend  
**Severidade:** Média

### Sintoma
Sistema pede o número de telefone manualmente mesmo quando o lead já tem o número cadastrado.

### Causa
Bug no `Leads.jsx` — o campo `form.phone` não estava sendo consultado antes do `prompt()`:
```javascript
// ERRADO:
const telefone = telefoneOverride || leadSel.phone || prompt(...)

// CORRETO:
const telefone = telefoneOverride || leadSel.phone || form.phone || prompt(...)
```

### Solução
Corrigir a função `enviarWhatsapp` no `Leads.jsx` — ver versão v8+.

### Prevenção
- Sempre checar `leadSel` E `form` para campos que podem vir de ambas as fontes.
- Antes de qualquer `prompt()`, verificar todas as fontes disponíveis do dado.

---

## ERRO-015 — Dados do lead não salvos (empresa, email, telefone)

**Data:** 19/03/2026  
**Categoria:** Extensão / Backend  
**Severidade:** Crítica

### Sintoma
Leads capturados pela extensão chegam sem empresa, email, telefone ou cargo.

### Causa (múltipla)
1. A extensão capturava dados mas o `content.js` não extraía corretamente empresa (usava `headline` em vez da seção `Experiência`).
2. O `manifest.json` não tinha permissão para acessar as "Informações de Contato" (modal separado no LinkedIn).

### Solução
No `content.js` (v7+):
- Empresa: extraída da seção **Experiência** (não da headline)
- Localização: filtrada para remover nomes próprios, manter apenas locais geográficos
- Contato: extensão tenta abrir o modal "Informações de Contato" automaticamente

### Prevenção
- Ao atualizar a extensão, sempre testar em um perfil real para verificar todos os campos.
- Campos esperados: `name`, `headline`, `company`, `location`, `phone`, `email`, `birthday`, `connected_since`, `about`, `connection_degree`, `mutual_connections`.

---

## Resumo de Erros por Categoria

| Categoria | Qtd | Erros |
|---|---|---|
| Ambiente / Terminal | 3 | 001, 003, 012 |
| Configuração (.env) | 2 | 002, 004 |
| Banco de Dados | 2 | 004, 011 |
| Autenticação | 2 | 006, 010 |
| Bug de Código | 4 | 007, 013, 014, 015 |
| Extensão Chrome | 2 | 008, 015 |
| Roteamento / Estrutura | 2 | 005, 009 |

---

## Checklist de Verificação — Antes de Reportar Erro

Antes de reportar um novo erro, verificar:

- [ ] O terminal está na pasta correta? (`C:\Users\samue\linkedin-prospector\backend`)
- [ ] O arquivo `.env` existe e está preenchido?
- [ ] A chave do Supabase é a `service_role` (não a `anon`)?
- [ ] O backend está rodando? (`http://localhost:3000`)
- [ ] O frontend está rodando? (`http://localhost:5173`)
- [ ] A extensão foi recarregada após atualizar os arquivos?
- [ ] O token JWT foi renovado nos últimos 7 dias?
- [ ] Os arquivos do ZIP foram colocados nas pastas corretas?

---

*Mantido pela equipe Cromosit IT | Atualizar sempre que novo erro for identificado e resolvido.*
