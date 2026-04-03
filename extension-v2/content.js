// content.js — LinkedIn Prospector v2.3 — Automação de Cliques em Chat Flutuante

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v2');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v2';
  banner.style.cssText = `position:fixed;top:20px;right:20px;z-index:999999;padding:14px 20px;background:${cor};color:white;font-family:sans-serif;font-size:13px;font-weight:600;border-radius:6px;box-shadow:0 6px 30px rgba(0,0,0,0.4);max-width:380px;white-space:pre-wrap;line-height:1.4;`;
  banner.innerText = '🚀 LP Prospector v2.3\n' + texto;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 7000);
}

// Digita texto simulando humano
async function digitarSimulado(elemento, texto) {
  elemento.focus();
  // Se for contenteditable, limpa o texto base
  if (elemento.getAttribute('contenteditable') === 'true') {
     elemento.innerHTML = '';
  } else {
     elemento.value = '';
  }
  
  const chars = texto.split('');
  for (const char of chars) {
    const event = new InputEvent('input', { bubbles: true, cancelable: true, data: char });
    const target = elemento.querySelector('p') || elemento;
    if (target.getAttribute('contenteditable') === 'true') {
       target.innerText += char;
    } else {
       target.value += char;
    }
    elemento.dispatchEvent(event);
    await esperar(Math.random() * 40 + 20);
  }
}

async function focarEEnviar() {
  // Detecta botão de envio em chats comuns e chats flutuantes (Overlays)
  const seletoresBotao = [
    '.msg-form__send-button', 
    'button[type="submit"].artdeco-button--primary',
    '.msg-overlay-bubble-header + .msg-overlay-conversation-container .msg-form__send-button',
    '.msg-form__footer button.artdeco-button--primary',
    'button.msg-form__send-button'
  ];

  let btnEnviar = null;
  for (const s of seletoresBotao) {
    btnEnviar = document.querySelector(s);
    if (btnEnviar) break;
  }

  if (btnEnviar && !btnEnviar.disabled) {
    await esperar(1000);
    btnEnviar.click();
    exibirBanner('✅ Mensagem entregue no chat!', '#00c896');
    await esperar(1500);
    window.close();
  } else {
    exibirBanner('⚠️ Mensagem escrita! Clique em Enviar.', '#ff9f0a');
  }
}

// Automação de Chat (Inbox 1º Grau)
async function automatizarChat(mensagem) {
  exibirBanner('⏳ Localizando chat ou sobreposição...');
  
  // Tenta achar a caixa de texto oficial ou a do Frederico (Overlay)
  const seletoresCaixa = [
    '.msg-form__contenteditable',
    '.msg-overlay-conversation-bubble [contenteditable="true"]',
    '[contenteditable="true"]',
    '.msg-form__placeholder'
  ];

  let caixa = null;
  for (const s of seletoresCaixa) {
    caixa = await aguardarElemento(s, 6000);
    if (caixa) break;
  }

  if (caixa) {
    // Se clicamos no placeholder, o LinkedIn foca no real
    if (caixa.classList.contains('msg-form__placeholder')) {
       caixa.click();
       await esperar(1000);
       caixa = document.querySelector('.msg-form__contenteditable') || document.querySelector('.msg-overlay-conversation-bubble [contenteditable="true"]');
    }
    
    await esperar(1500);
    await digitarSimulado(caixa, mensagem);
    await focarEEnviar();
  } else {
    exibirBanner('❌ Erro: Não encontrei o campo de chat flutuante.', '#ff3b5c');
  }
}

// Automação de Conexão (Nota 2º/3º Grau)
async function automatizarConexao(mensagem) {
  exibirBanner('⏳ Preparando pedido de conexão...');
  
  const btnNota = await aguardarElemento('button[aria-label="Adicionar nota"]', 4000);
  if (btnNota) {
    btnNota.click();
    await esperar(1000);
    const textarea = document.querySelector('textarea[name="message"]');
    if (textarea) {
      textarea.value = mensagem;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await esperar(800);
      const btnEnviar = document.querySelector('button[aria-label="Enviar agora"]');
      if (btnEnviar) {
        btnEnviar.click();
        exibirBanner('✅ Pedido enviado!', '#00c896');
        await esperar(1500);
        window.close();
      }
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

// Execução por URL
const params = new URLSearchParams(window.location.search);
const act = params.get('lp_action');
const msg = params.get('lp_msg');

if (msg) {
  const m = decodeURIComponent(msg);
  if (act === 'send_message') setTimeout(() => automatizarChat(m), 3000);
  else if (act === 'connect') setTimeout(() => automatizarConexao(m), 3000);
}
