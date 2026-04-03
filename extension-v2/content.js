// content.js — LinkedIn Prospector v5.6 ULTRA — Cérebro Nominação Real

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v4');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v4';
  banner.style.cssText = `position:fixed;top:25px;right:25px;z-index:9999999;padding:18px 22px;background:${cor};color:white;font-family:sans-serif;font-size:14px;font-weight:700;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.6);max-width:420px;white-space:pre-wrap;line-height:1.4;border-left:6px solid rgba(255,255,255,0.5);border-bottom:3px solid rgba(0,0,0,0.2);`;
  banner.innerHTML = `<div style="margin-bottom:10px;font-size:11px;opacity:0.9;letter-spacing:1.2px;font-weight:900">🏛️ LP v5.6 ULTRA</div>` + texto;
  document.body.appendChild(banner);
  if (cor === '#00c896') setTimeout(() => banner.remove(), 5000);
}

// 1️⃣ LÓGICA DE CAPTURA INDIVIDUAL - SENSOR DE NOME REAL (H1 + TITLE)
async function capturarPerfilIndividual() {
  exibirBanner('🕵️ ANALISANDO PERFIL: Buscando nome real...', '#1d8fe8');
  await esperar(1000);

  // Sensores de Nível 1
  let nome = document.querySelector('h1')?.innerText.trim();
  if (!nome || nome.length < 3) nome = document.title.split('|')[0].trim();
  if (!nome || nome.includes('LinkedIn')) nome = document.querySelector('.text-heading-xlarge')?.innerText.trim();

  const headline = document.querySelector('.text-body-medium.break-words')?.innerText.trim();
  const url = window.location.href.split('?')[0];

  // Dados de Contatos
  let email = ''; let telefone = '';
  const modal = document.querySelector('.pv-contact-info, [role="dialog"]');
  if (modal && modal.innerText.includes('Dados de contato')) {
      email = Array.from(modal.querySelectorAll('a')).find(a => a.href.includes('mailto:'))?.innerText.trim() || '';
      telefone = Array.from(modal.querySelectorAll('.pv-contact-info__contact-item')).find(el => el.innerText.match(/\d/))?.innerText.split('\n')[1]?.trim() || '';
  }

  const lead = {
    name: nome || 'Lead Desconhecido', headline: headline || '',
    email: email, phone: telefone,
    linkedin_url: url, source: 'linkedin_profile', status: 'novo',
    connection_degree: document.body.innerText.includes('· 1º') ? '1' : '3'
  };

  try {
    const res = await fetch('https://linkedin-prospector-production.up.railway.app/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead)
    });
    if (res.ok) exibirBanner(`✅ SALVO COM SUCESSO!\nLead: ${lead.name}\n📧 E-mail: ${email || '---'}\n📞 Zap: ${telefone || '---'}`, '#00c896');
    else throw new Error();
  } catch (err) {
    exibirBanner('❌ ERRO: Falha ao enviar para o CRM.', '#ff3b5c');
  }
}

// 2️⃣ LÓGICA DE ENVIO (MENSAGEIRO DINÂMICO)
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
  if (btnEnviar) { btnEnviar.click(); exibirBanner('✅ MENSAGEM ENVIADA!', '#00c896'); await esperar(1500); window.close(); }
}

async function automatizarChat(mensagem) {
  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim();
  exibirBanner(`🚀 MODO ENVIO: Preparando para ${nomeExibicao}...`, '#1d8fe8');
  let btnMsg = document.querySelector('.pvs-profile-actions button[aria-label^="Enviar mensagem"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enviar mensagem'));
  if (btnMsg && !document.querySelector('.msg-overlay-conversation-bubble')) { btnMsg.click(); await esperar(2500); }
  const caixa = await aguardarElemento('.msg-overlay-conversation-bubble [contenteditable="true"], .msg-form__contenteditable, [contenteditable="true"]', 10000);
  if (caixa) { await injetarTextoFormatado(caixa, mensagem); await focarEEnviar(); }
}

async function automatizarConexao(mensagem) {
  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim();
  exibirBanner(`🔗 CONEXÃO: Analisando perfil de ${nomeExibicao}...`, '#1d8fe8');
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
      if (btnEnviar) btnEnviar.click(); exibirBanner('✅ SOLICITAÇÃO ENVIADA!', '#00c896'); await esperar(1500); window.close();
    }
  } else { await automatizarChat(mensagem); }
}

async function aguardarElemento(sel, timeout) {
  return new Promise(res => {
    const el = document.querySelector(sel); if(el) return res(el);
    const obs = new MutationObserver(() => v = document.querySelector(sel); if(v){obs.disconnect(); res(v);});
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

// INICIALIZAÇÃO AGRESSIVA
const params = new URLSearchParams(window.location.search);
if (params.get('lp_msg')) {
    const m = decodeURIComponent(params.get('lp_msg'));
    const act = params.get('lp_action');
    setTimeout(() => {
      if (act === 'send_message') automatizarChat(m);
      else if (act === 'connect') automatizarConexao(m);
    }, 2000);
} else {
    setInterval(() => {
        if (window.location.href.includes('/in/')) {
            if (!document.getElementById('lp-btn-float-capturar')) {
                const btn = document.createElement('button');
                btn.id = 'lp-btn-float-capturar'; btn.innerText = '📞 Capturar Lead';
                btn.style.cssText = 'position:fixed;bottom:25px;right:25px;z-index:9999999;background:#00c896;color:white;border:none;padding:16px 26px;border-radius:40px;font-weight:bold;cursor:pointer;box-shadow:0 12px 30px rgba(0,200,150,0.5);border:2px solid white;';
                btn.onclick = capturarPerfilIndividual; document.body.appendChild(btn);
            }
        }
    }, 1500);
}
