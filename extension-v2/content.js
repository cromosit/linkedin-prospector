// content.js — LinkedIn Prospector v3.4 — Automação de Injeção com Espaçamento Correto

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v3');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v3';
  banner.style.cssText = `position:fixed;top:20px;right:20px;z-index:999999;padding:16px 20px;background:${cor};color:white;font-family:sans-serif;font-size:14px;font-weight:700;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:400px;white-space:pre-wrap;line-height:1.5;border-left:5px solid rgba(255,255,255,0.4);`;
  banner.innerHTML = `<div style="margin-bottom:5px">📢 LP PROSPECTOR DIAGNÓSTICO</div>` + texto;
  document.body.appendChild(banner);
  if (cor === '#00c896') setTimeout(() => banner.remove(), 4000);
}

// Injeta texto preservando espaços e formatação (Método de Colagem Oficial)
async function injetarTextoFormatado(elemento, texto) {
  elemento.focus();
  // Limpa o conteúdo atual da caixa de texto
  const p = elemento.querySelector('p') || elemento;
  p.innerHTML = ''; 
  
  // Usa o método ExecCommand para "Colar" o texto de forma humanizada (mantendo espaços)
  try {
     const dt = new DataTransfer();
     dt.setData('text/plain', texto);
     const ev = new ClipboardEvent('paste', {
       clipboardData: dt,
       bubbles: true,
       cancelable: true
     });
     elemento.dispatchEvent(ev);
     
     // Fallback caso o ClipboardEvent falhe
     if (p.innerText.length < 5) {
        document.execCommand('insertText', false, texto);
     }
  } catch (e) {
     p.innerText = texto; 
  }
  
  elemento.dispatchEvent(new Event('input', { bubbles: true }));
  exibirBanner('✍️ TEXTO: Abordagem injetada com espaços e formatação ok.', '#3b82f6');
}

async function focarEEnviar() {
  await esperar(1500);
  const seletoresBotao = [
    '.msg-overlay-conversation-bubble [type="submit"]',
    '.msg-form__send-button',
    'button.msg-form__send-button',
    'button.artdeco-button--primary[type="submit"]'
  ];
  let btnEnviar = null;
  for (const s of seletoresBotao) {
    btnEnviar = document.querySelector(s);
    if (btnEnviar) break;
  }
  if (btnEnviar) {
    btnEnviar.click();
    exibirBanner('✅ CONCLUÍDO: Mensagem enviada corretamente!', '#00c896');
    await esperar(1500);
    window.close();
  }
}

// Automação de Chat (Inbox 1º Grau)
async function automatizarChat(mensagem) {
  exibirBanner('🔍 MODO CHAT: Localizando área de texto...', '#1d8fe8');
  
  let btnMsg = document.querySelector('.pvs-profile-actions button[aria-label^="Enviar mensagem"]') || 
               Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enviar mensagem'));
               
  if (btnMsg && !document.querySelector('.msg-overlay-conversation-bubble')) {
     btnMsg.click();
     await esperar(2000);
  }

  // Smart Redirect caso continue bloqueando
  if (!document.querySelector('.msg-overlay-conversation-bubble') && !document.querySelector('.msg-form__contenteditable')) {
     const perfilId = window.location.href.split('/in/')[1]?.split('/')[0];
     if (perfilId) {
        window.location.href = `https://www.linkedin.com/messaging/compose/?recipient=${perfilId}&lp_action=send_message&lp_msg=${encodeURIComponent(mensagem)}`;
        return;
     }
  }

  const caixa = await aguardarElemento('.msg-overlay-conversation-bubble [contenteditable="true"], .msg-form__contenteditable, [contenteditable="true"]', 10000);
  if (caixa) {
    await injetarTextoFormatado(caixa, mensagem);
    await focarEEnviar();
  }
}

// Automação de Conexão (Nota Curta)
async function automatizarConexao(mensagem) {
  exibirBanner('🕵️ ANALISANDO: Verificando grau no Frederico...', '#1d8fe8');
  const perfilInfo = await aguardarConteudo(['· 1º', '1st degree', 'Conectar', 'Connect', 'Seguir'], 15000);
  
  if (perfilInfo.includes('· 1º') || perfilInfo.includes('1st degree')) {
     return await automatizarChat(mensagem);
  }

  exibirBanner('🔗 CONEXÃO: Localizando botão de conexão...', '#1d8fe8');
  const btnNota = await aguardarElemento('button[aria-label="Adicionar nota"]', 6000);
  if (btnNota) {
    btnNota.click();
    const textarea = await aguardarElemento('textarea[name="message"]', 3000);
    if (textarea) {
      const msgCurta = mensagem.length > 200 ? mensagem.substring(0, 197) + '...' : mensagem;
      textarea.value = msgCurta;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await esperar(1000);
      const btnEnviar = document.querySelector('button[aria-label="Enviar agora"]');
      if (btnEnviar) btnEnviar.click();
      exibirBanner('✅ CONEXÃO DISPARADA!', '#00c896');
      await esperar(1500); window.close();
    }
  } else {
     await automatizarChat(mensagem);
  }
}

async function aguardarElemento(sel, timeout) {
  return new Promise(res => {
    const el = document.querySelector(sel);
    if (el) return res(el);
    const obs = new MutationObserver(() => {
      const e = document.querySelector(sel);
      if (e) { obs.disconnect(); res(e); }
    });
    obs.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => { obs.disconnect(); res(null); }, timeout);
  });
}

async function aguardarConteudo(termos, timeout) {
  return new Promise(res => {
    const check = () => termos.some(t => document.body.innerText.includes(t));
    if (check()) return res(document.body.innerText);
    const obs = new MutationObserver(() => {
      if (check()) { obs.disconnect(); res(document.body.innerText); }
    });
    obs.observe(document.body, { childList:true, subtree:true, characterData:true });
    setTimeout(() => { obs.disconnect(); res(document.body.innerText); }, timeout);
  });
}

// Inicia execução
const params = new URLSearchParams(window.location.search);
if (params.get('lp_msg')) {
  const m = decodeURIComponent(params.get('lp_msg'));
  const act = params.get('lp_action');
  setTimeout(() => {
    if (act === 'send_message') automatizarChat(m);
    else if (act === 'connect') automatizarConexao(m);
  }, 2500);
}
