// content.js — LinkedIn Prospector v5.5 — Super Cérebro Híbrido (Mensário Sagrado)

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v3');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v3';
  banner.style.cssText = `position:fixed;top:20px;right:20px;z-index:999999;padding:16px 20px;background:${cor};color:white;font-family:sans-serif;font-size:14px;font-weight:700;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:400px;white-space:pre-wrap;line-height:1.4;border-left:5px solid rgba(255,255,255,0.4);`;
  banner.innerHTML = `<div style="margin-bottom:8px;font-size:10px;opacity:0.8;letter-spacing:1px;font-weight:800">🏛️ LP PROSPECTOR v5.5</div>` + texto;
  document.body.appendChild(banner);
  if (cor === '#00c896') setTimeout(() => banner.remove(), 4000);
}

// 1️⃣ LÓGICA DE CAPTURA (SARA / PAULO) - AGORA EM SEGUNDO PLANO
async function capturarPerfilIndividual() {
  exibirBanner('🕵️ ANALISANDO PERFIL: Extraindo dados...', '#1d8fe8');
  await esperar(1000);

  const nome = document.querySelector('.pv-top-card--list li, .text-heading-xlarge, h1')?.innerText.trim();
  const headline = document.querySelector('.text-body-medium.break-words')?.innerText.trim();
  const url = window.location.href.split('?')[0];

  const lead = {
    name: nome || 'Lead LinkedIn', headline: headline || '',
    linkedin_url: url, source: 'linkedin_profile', status: 'novo',
    connection_degree: document.body.innerText.includes('· 1º') ? '1' : '3'
  };

  try {
    await fetch('https://linkedin-prospector-production.up.railway.app/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead)
    });
    exibirBanner(`✅ SUCESSO!\n${lead.name} salvo no CRM.`, '#00c896');
  } catch (err) {
    exibirBanner('⚠️ CAPTURA: Falha ao salvar (CORS/URL). Tentando modo manual...', '#ff9f0a');
  }
}

// 2️⃣ LÓGICA DE ENVIO (FREDERICO) - SAGRADA E SEM INTERRUPÇÕES
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
  exibirBanner('🚀 MODO ENVIO: Localizando Frederico...', '#1d8fe8');
  let btnMsg = document.querySelector('.pvs-profile-actions button[aria-label^="Enviar mensagem"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enviar mensagem'));
  if (btnMsg && !document.querySelector('.msg-overlay-conversation-bubble')) { btnMsg.click(); await esperar(2500); }
  const caixa = await aguardarElemento('.msg-overlay-conversation-bubble [contenteditable="true"], .msg-form__contenteditable, [contenteditable="true"]', 10000);
  if (caixa) { await injetarTextoFormatado(caixa, mensagem); await focarEEnviar(); }
}

async function automatizarConexao(mensagem) {
  exibirBanner('🔗 CONEXÃO: Analisando grau para envio...', '#1d8fe8');
  const perfilInfo = await aguardarConteudo(['· 1º', '1st degree', 'Conectar'], 15000);
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

// INICIALIZAÇÃO SEGURA
const params = new URLSearchParams(window.location.search);
if (params.get('lp_msg')) {
    // SE É PARA ENVIAR MENSAGEM, O ROBÔ VAI DIRETO PRO ENVIO E IGNORA O RESTO!
    const m = decodeURIComponent(params.get('lp_msg'));
    const act = params.get('lp_action');
    setTimeout(() => {
      if (act === 'send_message') automatizarChat(m);
      else if (act === 'connect') automatizarConexao(m);
    }, 2000);
} else {
    // SE É APENAS NAVEGAÇÃO, ELE MOSTRA O BOTÃO DE CAPTURA
    setInterval(() => {
        if (window.location.href.includes('/in/')) {
            if (!document.getElementById('lp-btn-float-capturar')) {
                const btn = document.createElement('button');
                btn.id = 'lp-btn-float-capturar'; btn.innerText = '📞 Capturar Lead';
                btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#00c896;color:white;border:none;padding:12px 25px;border-radius:30px;font-weight:bold;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:2px solid white;';
                btn.onclick = capturarPerfilIndividual; document.body.appendChild(btn);
            }
        }
        if (window.location.href.includes('/search/results/')) {
            const perfis = document.querySelectorAll('.entity-result__item, .reusable-search__result-container');
            perfis.forEach(perfil => {
               if (!perfil.querySelector('.btn-capturar-lp')) {
                   const btn = document.createElement('button');
                   btn.className = 'btn-capturar-lp'; btn.innerText = '＋ Prospectar';
                   btn.style.cssText = 'background:#1d8fe8;color:white;border:none;padding:5px 12px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer;margin-left:15px;';
                   btn.onclick = async (e) => {
                     const lead = { name: perfil.querySelector('.entity-result__title-text a')?.innerText.split('\n')[0].trim(), linkedin_url: perfil.querySelector('.entity-result__title-text a')?.href.split('?')[0], source: 'linkedin_search' };
                     await fetch('https://linkedin-prospector-production.up.railway.app/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(lead) });
                     btn.innerText = '✅'; btn.style.background = '#00c896';
                   };
                   perfil.querySelector('.entity-result__actions, .reusable-search__result-action-column')?.appendChild(btn);
               }
            });
        }
    }, 2000);
}
