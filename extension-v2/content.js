// content.js — LinkedIn Prospector v5.1 — Super Cérebro Híbrido (Caputura Incansável)

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v3');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v3';
  banner.style.cssText = `position:fixed;top:20px;right:20px;z-index:999999;padding:16px 20px;background:${cor};color:white;font-family:sans-serif;font-size:14px;font-weight:700;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:400px;white-space:pre-wrap;line-height:1.4;border-left:5px solid rgba(255,255,255,0.4);border-bottom:2px solid rgba(0,0,0,0.2);`;
  banner.innerHTML = `<div style="margin-bottom:8px;font-size:10px;opacity:0.8;letter-spacing:1px;font-weight:800">🏛️ LP PROSPECTOR v5.1</div>` + texto;
  document.body.appendChild(banner);
  if (cor === '#00c896') setTimeout(() => banner.remove(), 4000);
}

// 1️⃣ LÓGICA DE CAPTURA INDIVIDUAL (SARA / TANIA / ROGERIO)
async function capturarPerfilIndividual() {
  exibirBanner('🕵️ ANALISANDO PERFIL: Buscando dados da Sara...', '#1d8fe8');
  await esperar(1000);

  // Múltiplos sensores para o Nome
  const nome = document.querySelector('.pv-top-card--list li, .text-heading-xlarge')?.innerText.trim() || 
               document.querySelector('h1')?.innerText.trim();
               
  // Múltiplos sensores para Headline/Cargo
  const headline = document.querySelector('.text-body-medium.break-words')?.innerText.trim() || 
                   document.querySelector('div[data-generated-suggestion-target]')?.innerText.trim();
                   
  // Múltiplos sensores para Local
  const local = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText.trim() || 
                document.querySelector('.pv-top-card-section__location')?.innerText.trim();
                
  // Empresa Atual
  const empresa = Array.from(document.querySelectorAll('div')).find(el => el.getAttribute('aria-label')?.includes('Empresa atual'))?.innerText.trim() || 
                  document.querySelector('.pv-top-card--experience-list-item')?.innerText.split('\n')[0].trim() || '';

  const url = window.location.href.split('?')[0];

  if (!nome) {
      exibirBanner('❌ ERRO: O LinkedIn mudou seletores. Tentando capturar modo forçado...', '#ff3b5c');
      // Tentativa final via busca bruta por H1
      const nomeH1 = document.querySelector('h1')?.innerText.trim();
      if (!nomeH1) return;
  }

  const lead = {
    name: nome || document.querySelector('h1')?.innerText.trim(),
    headline: headline || '',
    company: empresa,
    location: local || '',
    linkedin_url: url,
    source: 'linkedin_profile',
    status: 'novo',
    connection_degree: document.body.innerText.includes('· 1º') ? '1' : document.body.innerText.includes('· 2º') ? '2' : '3'
  };

  try {
    const response = await fetch('https://linkedin-prospector-production.up.railway.app/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    
    if (response.ok) {
       exibirBanner(`✅ SUCESSO!\n${lead.name} salvo no seu CRM.`, '#00c896');
    } else {
       throw new Error();
    }
  } catch (err) {
    exibirBanner('❌ ERRO: Falha ao salvar no Railway.', '#ff3b5c');
  }
}

// Injeção Inabalável do Botão
function InjetarBotaoCapturaFlutuante() {
    if (document.getElementById('lp-btn-float-capturar')) return;
    const btn = document.createElement('button');
    btn.id = 'lp-btn-float-capturar';
    btn.innerText = '📞 Capturar Lead';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#00c896;color:white;border:none;padding:12px 22px;border-radius:30px;font-weight:bold;cursor:pointer;box-shadow:0 10px 30px rgba(0,200,150,0.5);border:2px solid white;';
    btn.onclick = capturarPerfilIndividual;
    document.body.appendChild(btn);
}

// 2️⃣ LÓGICA DE CAPTURA EM MASSA
function detectarEBotoar() {
  const perfis = document.querySelectorAll('.entity-result__item, .reusable-search__result-container');
  perfis.forEach(perfil => {
    if (perfil.querySelector('.btn-capturar-lp')) return;
    const btn = document.createElement('button');
    btn.className = 'btn-capturar-lp'; btn.innerText = '＋ Prospectar';
    btn.style.cssText = 'background:#1d8fe8;color:white;border:none;padding:5px 12px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer;margin-left:15px;';
    btn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const lead = {
        name: perfil.querySelector('.entity-result__title-text a')?.innerText.split('\n')[0].trim(),
        headline: perfil.querySelector('.entity-result__primary-subtitle')?.innerText.trim(),
        linkedin_url: perfil.querySelector('.entity-result__title-text a')?.href.split('?')[0],
        source: 'linkedin_search', status: 'novo', connection_degree: '3'
      };
      await fetch('https://linkedin-prospector-production.up.railway.app/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(lead) });
      btn.innerText = '✅ OK'; btn.style.background = '#00c896';
    };
    const target = perfil.querySelector('.entity-result__actions, .reusable-search__result-action-column');
    if (target) target.appendChild(btn);
  });
}

// 3️⃣ LÓGICA DE AUTOMAÇÃO DE MENSAGENS (FREDERICO OK)
async function injetarTextoFormatado(elemento, texto) {
  elemento.focus();
  const p = elemento.querySelector('p') || elemento; p.innerHTML = ''; 
  try {
     const dt = new DataTransfer(); dt.setData('text/plain', texto);
     const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
     elemento.dispatchEvent(ev);
     if (p.innerText.length < 5) document.execCommand('insertText', false, texto);
  } catch (e) { p.innerText = texto; }
  elemento.dispatchEvent(new Event('input', { bubbles: true }));
}

async function focarEEnviar() {
  await esperar(1500);
  const btnEnviar = document.querySelector('.msg-overlay-conversation-bubble [type="submit"], .msg-form__send-button, button.artdeco-button--primary[type="submit"]');
  if (btnEnviar) { btnEnviar.click(); exibirBanner('✅ ENVIADO!', '#00c896'); await esperar(1500); window.close(); }
}

async function automatizarChat(mensagem) {
  let btnMsg = document.querySelector('.pvs-profile-actions button[aria-label^="Enviar mensagem"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enviar mensagem'));
  if (btnMsg && !document.querySelector('.msg-overlay-conversation-bubble')) { btnMsg.click(); await esperar(2500); }
  const caixa = await aguardarElemento('.msg-overlay-conversation-bubble [contenteditable="true"], .msg-form__contenteditable, [contenteditable="true"]', 10000);
  if (caixa) { await injetarTextoFormatado(caixa, mensagem); await focarEEnviar(); }
}

async function automatizarConexao(mensagem) {
  const perfilInfo = await aguardarConteudo(['· 1º', '1st degree', 'Conectar', 'Connect'], 15000);
  if (perfilInfo.includes('· 1º') || perfilInfo.includes('1st degree')) return await automatizarChat(mensagem);
  const btnNota = await aguardarElemento('button[aria-label="Adicionar nota"]', 6000);
  if (btnNota) {
    btnNota.click();
    const textarea = await aguardarElemento('textarea[name="message"]', 3000);
    if (textarea) {
      textarea.value = mensagem.length > 200 ? mensagem.substring(0, 197) + '...' : mensagem;
      textarea.dispatchEvent(new Event('input', { bubbles: true })); await esperar(1000);
      const btnEnviar = document.querySelector('button[aria-label="Enviar agora"]');
      if (btnEnviar) btnEnviar.click(); exibirBanner('✅ CONEXÃO DISPARADA!', '#00c896'); await esperar(1500); window.close();
    }
  } else { await automatizarChat(mensagem); }
}

async function aguardarElemento(sel, timeout) {
  return new Promise(res => {
    const el = document.querySelector(sel); if(el) return res(el);
    const obs = new MutationObserver(() => { const e = document.querySelector(sel); if(e){obs.disconnect(); res(e);} });
    obs.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => { obs.disconnect(); res(null); }, timeout);
  });
}

async function aguardarConteudo(termos, timeout) {
  return new Promise(res => {
    const check = () => termos.some(t => document.body.innerText.includes(t));
    if(check()) return res(document.body.innerText);
    const obs = new MutationObserver(() => { if(check()){obs.disconnect(); res(document.body.innerText);} });
    obs.observe(document.body, { childList:true, subtree:true, characterData:true });
    setTimeout(() => { obs.disconnect(); res(document.body.innerText); }, timeout);
  });
}

// INICIALIZAÇÃO CONTÍNUA
setInterval(() => {
    if (window.location.href.includes('/in/')) InjetarBotaoCapturaFlutuante();
    if (window.location.href.includes('/search/results/')) detectarEBotoar();
}, 2000);

const params = new URLSearchParams(window.location.search);
if (params.get('lp_msg')) {
  setTimeout(() => {
    const m = decodeURIComponent(params.get('lp_msg'));
    const act = params.get('lp_action');
    if (act === 'send_message') automatizarChat(m);
    else if (act === 'connect') automatizarConexao(m);
  }, 2500);
}
