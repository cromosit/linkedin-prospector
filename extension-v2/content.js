// content.js — LinkedIn Prospector v2.1 — Automação de Mensagens (Correção de Chat)

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v2');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v2';
  banner.style.cssText = `position:fixed;top:20px;right:20px;z-index:999999;padding:14px 20px;background:${cor};color:white;font-family:sans-serif;font-size:13px;font-weight:600;border-radius:6px;box-shadow:0 6px 30px rgba(0,0,0,0.4);max-width:380px;white-space:pre-wrap;line-height:1.4;`;
  banner.innerText = '🚀 LP Prospector v2.1\n' + texto;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 7000);
}

// Digita texto simulando humano em campos ContentEditable
async function digitarSimulado(elemento, texto) {
  elemento.focus();
  
  // Limpa se for a primeira vez
  if (elemento.innerText.trim() === 'Escreva uma mensagem' || elemento.innerText.trim() === '') {
    elemento.innerHTML = ''; 
  }

  const chars = texto.split('');
  for (const char of chars) {
    const event = new InputEvent('input', { bubbles: true, cancelable: true, data: char });
    
    // Se for um parágrafo interno (LinkedIn as vezes usa <p>)
    const target = elemento.querySelector('p') || elemento;
    target.innerText += char;
    
    elemento.dispatchEvent(event);
    await esperar(Math.random() * 40 + 20); // 20-60ms por letra
  }
  elemento.dispatchEvent(new Event('change', { bubbles: true }));
}

async function focarEEnviar() {
  const botaoEnviar = document.querySelector('.msg-form__send-button') || 
                      document.querySelector('button[type="submit"].artdeco-button--primary') ||
                      document.querySelector('.msg-form__footer button.artdeco-button--primary');
  
  if (botaoEnviar && !botaoEnviar.disabled) {
    await esperar(800);
    botaoEnviar.click();
    exibirBanner('✅ Mensagem enviada com sucesso!', '#00c896');
    await esperar(1500);
    window.close(); 
  } else {
    exibirBanner('⚠️ Mensagem escrita! Clique em Enviar.', '#ff9f0a');
  }
}

// Automação de Inbox (Chat de 1º Grau)
async function automatizarMensagemInbox(mensagem) {
  exibirBanner('⏳ Automatizando envio no chat...');
  
  // Aguarda caixa de texto do LinkedIn (tenta vários seletores do chat)
  const seletoresChat = [
    '.msg-form__contenteditable',
    '[contenteditable="true"]',
    '.msg-form__placeholder'
  ];

  let caixaTexto = null;
  for (const sel of seletoresChat) {
    caixaTexto = await aguardarElemento(sel, 3000);
    if (caixaTexto) break;
  }
  
  if (!caixaTexto) {
    exibirBanner('❌ Erro: Não encontrei a caixa de texto do chat.', '#ff3b5c');
    return;
  }

  await esperar(1000);
  
  // Se clicamos no placeholder, o LinkedIn foca no real
  if (caixaTexto.classList.contains('msg-form__placeholder')) {
     caixaTexto.click();
     await esperar(500);
     caixaTexto = document.querySelector('.msg-form__contenteditable');
  }

  await digitarSimulado(caixaTexto, mensagem);
  await focarEEnviar();
}

// Automação de Conexão (Nota de 2º Grau)
async function automatizarConexao(mensagem) {
  exibirBanner('⏳ Iniciando pedido de conexão...');
  
  // Tenta clicar no botão "Adicionar nota" se o modal já abriu
  const btnNota = await aguardarElemento('button[aria-label="Adicionar nota"]', 3000);
  
  if (btnNota) {
    btnNota.click();
    await esperar(1000);
    
    const campoNota = document.querySelector('textarea[name="message"]');
    if (campoNota) {
      campoNota.value = mensagem;
      campoNota.dispatchEvent(new Event('input', { bubbles: true }));
      await esperar(800);
      
      const btnEnviar = document.querySelector('button[aria-label="Enviar agora"]');
      if (btnEnviar) {
        btnEnviar.click();
        exibirBanner('✅ Pedido de conexão enviado!', '#00c896');
        await esperar(1500);
        window.close();
      }
    }
  } else {
     // Se não abriu o modal de nota, talvez abriu o chat de mensagem direta?
     // Fallback para inbox
     await automatizarMensagemInbox(mensagem);
  }
}

// Sincroniza token enviado pelo CRM
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'LP_PROSPECTOR_TOKEN' && event.data?.token) {
    chrome.storage.local.set({ token: event.data.token });
  }
});

// Aguarda elemento aparecer no DOM
async function aguardarElemento(selector, timeout = 4000) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

// Extrai e envia dados (Normalizado)
const params = new URLSearchParams(window.location.search);
const lpAction = params.get('lp_action');
const lpMsg    = params.get('lp_msg');

// Inicia ações baseadas na URL
if (lpMsg) {
  const mensagem = decodeURIComponent(lpMsg);
  if (lpAction === 'send_message') {
    setTimeout(() => automatizarMensagemInbox(mensagem), 2000);
  } else if (lpAction === 'connect') {
    setTimeout(() => automatizarConexao(mensagem), 2000);
  }
}
