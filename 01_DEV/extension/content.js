// content.js — LinkedIn Prospector ULTRA v6.0 — Cérebro e Captura Híbrida Completa

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v4');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v4';
  banner.style.cssText = `position:fixed;top:25px;right:25px;z-index:9999999;padding:18px 22px;background:#00ffc8;color:#00332c;font-family:sans-serif;font-size:14px;font-weight:800;border-radius:12px;box-shadow:0 15px 50px rgba(0,255,200,0.4);max-width:420px;white-space:pre-wrap;line-height:1.4;border-left:8px solid #008f70;`;
  banner.innerHTML = `<div style="margin-bottom:10px;font-size:11px;opacity:1;letter-spacing:1.5px;font-weight:900;color:#005544">🏛️ LP v6.0.0 ULTRA</div>` + texto;
  document.body.appendChild(banner);
  if (cor === '#00c896' || cor === '#00ffc8') setTimeout(() => banner.remove(), 6000);
}

console.log('%c🏛️ LINKEDIN PROSPECTOR v6.0.0 ULTRA ATIVADO!', 'color: #00ffc8; font-size: 30px; font-weight: bold; text-shadow: 2px 2px #000;');

// 1️⃣ LÓGICA DE EXTRAÇÃO DE DADOS BÁSICOS
function extrairBasico() {
  const dados = { 
    name: '', 
    headline: '', 
    location: '', 
    company: '', 
    linkedin_url: window.location.href.split('?')[0], 
    linkedin_id: window.location.href.split('/in/')[1]?.split('/')[0]?.replace('/', ''), 
    source: 'linkedin_profile' 
  };
  
  try {
    let nameVal = '';
    const h1El = document.querySelector('h1.text-heading-xlarge, h1');
    if (h1El) nameVal = h1El.innerText.split('\n')[0].trim();
    if (!nameVal || nameVal.toLowerCase().includes('linkedin')) {
      nameVal = document.title.split('|')[0].split('-')[0].replace(' (Personal)', '').trim();
    }
    dados.name = nameVal || 'Lead Desconhecido';
    dados.headline = document.querySelector('.text-body-medium.break-words, h2')?.innerText.trim() || '';
    dados.company = document.querySelector('.pv-text-details__right-panel li button span, [data-field="experience"]')?.innerText.trim() || '';
    dados.location = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText.trim() || '';
    
    // Grau de conexão
    let grau = '3';
    const grauTexto = document.querySelector('.dist-value, .entity-result__badge, .pv-member-badge--level')?.innerText || document.body.innerText;
    if (grauTexto.includes('1º') || grauTexto.includes('1st')) grau = '1';
    else if (grauTexto.includes('2º') || grauTexto.includes('2nd')) grau = '2';
    dados.connection_degree = grau;
    dados.profile_picture = document.querySelector('.pv-top-card-profile-picture__image--show, img.pv-top-card-profile-picture__image')?.src || '';
  } catch(e) {
    console.error('[Prospector] Erro no extrairBasico:', e);
  }
  return dados;
}

// 2️⃣ LÓGICA DE CAPTURA DOS CONTATOS (E-MAIL, FONE, SITE, ANIVERSÁRIO)
async function buscarContatos(dados) {
  // Abre a janela de contatos se não estiver aberta
  if (!window.location.hash.includes('contact-info') && !document.querySelector('[role="dialog"], .artdeco-modal')) {
     const btn = document.querySelector('#top-card-text-details-contact-info, [href*="/contact-info/"]');
     if (btn) {
       btn.click();
       console.log('[Prospector] Clicou para abrir dados de contato.');
       await esperar(2000);
     }
  }

  // Tenta encontrar o container do modal
  const modal = document.querySelector('[role="dialog"], .artdeco-modal, .artdeco-modal__content, .pv-contact-info, #artdeco-modal-outlet');
  
  if (modal || window.location.href.includes('contact-info')) {
    console.log('[Prospector] Extraindo dados do modal de contato...');
    const container = modal || document.body;
    
    // 1. Extração de E-mail (por link mailto ou regex)
    const emailEl = container.querySelector('a[href^="mailto:"]');
    if (emailEl) {
      dados.email = emailEl.href.replace('mailto:', '').trim();
    } else {
      const emailMatch = container.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) dados.email = emailMatch[0];
    }
    
    // 2. Extração de Telefone (por link tel ou regex)
    const foneEl = container.querySelector('a[href^="tel:"]');
    if (foneEl) {
      dados.phone = foneEl.href.replace('tel:', '').trim();
    } else {
      const phoneMatch = container.innerText.match(/(\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4})/);
      if (phoneMatch) dados.phone = phoneMatch[0];
    }
    
    // 3. Extração de Website (busca links que não sejam linkedin.com ou mailto)
    const links = Array.from(container.querySelectorAll('a'));
    const linkExterno = links.find(a => a.href && !a.href.includes('linkedin.com') && !a.href.startsWith('mailto:') && !a.href.startsWith('tel:'));
    if (linkExterno) {
      dados.website = linkExterno.href;
    }
    
    // 4. Aniversário e Data de Conexão (procurando pelos textos das seções)
    const sections = Array.from(container.querySelectorAll('section, .pv-contact-info__contact-type, .pv-profile-section'));
    sections.forEach(s => {
      const t = s.innerText.toLowerCase();
      if (t.includes('aniversário') || t.includes('birthday')) {
        dados.birthday = s.querySelector('.pv-contact-info__contact-item, span:last-child, .pv-contact-info__header + *')?.innerText.trim();
      }
      if (t.includes('conexão desde') || t.includes('connected')) {
        dados.connected_since = s.querySelector('.pv-contact-info__contact-item, span:last-child, .pv-contact-info__header + *')?.innerText.trim();
      }
    });

    console.log('[Prospector] Dados de contato extraídos:', { email: dados.email, phone: dados.phone, website: dados.website, birthday: dados.birthday, connected_since: dados.connected_since });

    // Fecha o modal clicando fora ou no botão de fechar
    const closeBtn = document.querySelector('.artdeco-modal__dismiss, [aria-label*="Fechar"], [aria-label*="Close"], button.artdeco-button');
    if (closeBtn) {
      closeBtn.click();
    } else {
      // Fallback: pressiona ESC para fechar o modal
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    }
  }
}

// 3️⃣ LÓGICA DE CAPTURA INDIVIDUAL - SALVA NO CRM VIA PORTA LOCAL
async function capturarPerfilIndividual() {
  const dadosBasicos = extrairBasico();
  exibirBanner(`🕵️ CAPTURANDO CONTATOS: ${dadosBasicos.name}...`, '#1d8fe8');
  
  await buscarContatos(dadosBasicos);

  exibirBanner(`📡 SALVANDO NO CRM: ${dadosBasicos.name}...`, '#1d8fe8');

  // Envia a requisição via Proxy do Background
  chrome.runtime.sendMessage({
    action: 'apiRequest',
    method: 'POST',
    path: '/api/leads',
    body: dadosBasicos
  }, (res) => {
    if (res && res.sucesso) {
      exibirBanner(`✅ LEAD CAPTURADO E ENRIQUECIDO!\nLead: ${dadosBasicos.name}\nGrau: ${dadosBasicos.connection_degree}º`, '#00ffc8');
    } else {
      console.error('[Prospector] Erro no CRM:', res?.erro);
      exibirBanner(`❌ ERRO NO SALVAMENTO!\n${res?.erro || 'CRM offline ou sem Token'}`, '#ff3b5c');
    }
  });
}

// 4️⃣ LÓGICA DE DIGITAÇÃO E ENVIO DE MENSAGENS
async function injetarTextoFormatado(elemento, texto) {
  elemento.focus();
  const p = elemento.querySelector('p') || elemento; 
  p.innerHTML = ''; 
  try {
     document.execCommand('insertText', false, texto);
  } catch (e) { 
     p.innerText = texto; 
  }
  elemento.dispatchEvent(new Event('input', { bubbles: true }));
}

async function focarEEnviar() {
  await esperar(1500);
  const btnEnviar = document.querySelector('.msg-overlay-conversation-bubble [type="submit"], .msg-form__send-button, button.artdeco-button--primary[type="submit"]');
  if (btnEnviar) { 
    btnEnviar.click(); 
    exibirBanner('✅ MENSAGEM ENVIADA!', '#00c896'); 
    await esperar(1500); 
    window.close(); 
  }
}

async function automatizarChat(mensagem) {
  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim();
  exibirBanner(`🚀 MODO ENVIO: Injetando mensagem para ${nomeExibicao}...`, '#1d8fe8');
  
  let caixaMsgAberta = document.querySelector('.msg-form__contenteditable, .msg-overlay-conversation-bubble [contenteditable="true"]');
  
  if (!caixaMsgAberta) {
    let btnMsg = document.querySelector('.pvs-profile-actions button[aria-label^="Enviar mensagem"], .pvs-profile-actions a[aria-label^="Enviar mensagem"]') || 
                 Array.from(document.querySelectorAll('button, a')).find(el => {
                   const text = el.innerText.trim().toLowerCase();
                   return text === 'enviar mensagem' || text === 'message' || text === 'mensagem';
                 });
                 
    if (btnMsg) { 
        if (btnMsg.href && btnMsg.href.includes('/messaging/')) {
          console.log('[Prospector] Redirecionando direto para o chat...');
          window.location.href = btnMsg.href;
          return;
        } else {
          btnMsg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          btnMsg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          btnMsg.click(); 
        }
    }
  }

  let caixa = null;
  for (let i = 0; i < 12; i++) {
    caixa = document.querySelector('.msg-form__contenteditable, .msg-overlay-conversation-bubble [contenteditable="true"], [role="textbox"], .msg-form__textarea');
    if (!caixa) {
      caixa = Array.from(document.querySelectorAll('[contenteditable="true"]')).find(el => 
        el.getAttribute('aria-label')?.includes('mensagem') || el.getAttribute('placeholder')?.includes('mensagem') || el.innerText.includes('Escreva')
      );
    }
    if (caixa) break;
    await esperar(500);
  }

  if (caixa) { 
      caixa.focus();
      caixa.click();
      await esperar(800);
      await injetarTextoFormatado(caixa, mensagem); 
      await focarEEnviar(); 
  } else {
      exibirBanner('❌ ERRO: Caixa de chat não encontrada!', '#ff3b5c');
  }
}

async function automatizarConexao(mensagem) {
  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim();
  exibirBanner(`🔗 CONEXÃO: Analisando perfil de ${nomeExibicao}...`, '#1d8fe8');
  
  // Se for contato 1º grau, usa fluxo do chat
  const grauTexto = document.body.innerText;
  if (grauTexto.includes('· 1º') || grauTexto.includes('1st degree')) return await automatizarChat(mensagem);

  const btnNota = await aguardarElemento('button[aria-label="Adicionar nota"], button[aria-label^="Add a note"]', 6000);
  if (btnNota) {
    btnNota.click();
    const textarea = await aguardarElemento('textarea[name="message"]', 3000);
    if (textarea) {
      textarea.value = mensagem.length > 200 ? mensagem.substring(0, 197) + '...' : mensagem;
      textarea.dispatchEvent(new Event('input', { bubbles: true })); 
      await esperar(1000);
      const btnEnviar = document.querySelector('button[aria-label="Enviar agora"], button[aria-label^="Send now"]');
      if (btnEnviar) btnEnviar.click(); 
      exibirBanner('✅ CONEXÃO ENVIADA COM SUCESSO!', '#00c896'); 
      await esperar(1500); 
      window.close();
    }
  } else { 
    await automatizarChat(mensagem); 
  }
}

async function aguardarElemento(sel, timeout) {
  return new Promise(res => {
    const el = document.querySelector(sel); if(el) return res(el);
    const obs = new MutationObserver(() => {
        const v = document.querySelector(sel);
        if(v){ obs.disconnect(); res(v); }
    });
    obs.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => { obs.disconnect(); res(null); }, timeout);
  });
}

// 5️⃣ SENSOR DE PRESENÇA DO BOTÃO FLUTUANTE
function monitorarPerfil() {
    if (!window.location.href.includes('/in/')) return;
    if (document.getElementById('lp-btn-float-v58')) return;

    let nome = document.querySelector('h1')?.innerText.trim();
    if (!nome) nome = document.title.split('|')[0].trim();

    if (nome && !nome.includes('LinkedIn')) {
        const btn = document.createElement('button');
        btn.id = 'lp-btn-float-v58';
        btn.innerHTML = `<span>⚡</span> Capturar <b>${nome.split(' ')[0]}</b>`;
        btn.style.cssText = `position:fixed;bottom:30px;right:30px;z-index:9999999;background:#1d8fe8;color:white;border:none;padding:18px 28px;border-radius:50px;font-weight:800;cursor:pointer;box-shadow:0 15px 45px rgba(29,143,232,0.5);border:3px solid white;font-family:Inter,sans-serif;font-size:16px;display:flex;align-items:center;gap:10px;transition:all 0.3s;`;
        btn.onmouseover = () => btn.style.transform = 'scale(1.05) translateY(-5px)';
        btn.onmouseout = () => btn.style.transform = 'scale(1) translateY(0)';
        btn.onclick = capturarPerfilIndividual;
        document.body.appendChild(btn);
        console.log(`[v6.0] ✅ Botão injetado para: ${nome}`);
    }
}

// 6️⃣ MOTOR DE ATUALIZAÇÃO DE STATUS E HISTÓRICO
async function registrarSucessoEnvio() {
    const leadId = params.get('leadId');
    if (!leadId) return;

    chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'PUT',
        path: `/api/leads/${leadId}`,
        body: { status: 'contatado' }
    }, (res) => {
        if (res && res.sucesso) {
            chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'POST',
                path: `/api/leads/${leadId}/atividades`,
                body: { type: 'mensagem_enviada', description: `Mensagem enviada automaticamente via LinkedIn em ${new Date().toLocaleString()}` }
            });
        }
    });
}

// INICIALIZAÇÃO E MONITORAMENTO SPA
const params = new URLSearchParams(window.location.search);
if (params.get('lp_msg')) {
    const m = decodeURIComponent(params.get('lp_msg'));
    const act = params.get('lp_action');
    setTimeout(async () => {
      if (act === 'send_message') {
          await automatizarChat(m);
          await registrarSucessoEnvio();
      }
      else if (act === 'connect') await automatizarConexao(m);
    }, 2000);
} else {
    const observer = new MutationObserver(monitorarPerfil);
    observer.observe(document.body, { childList: true, subtree: true });
    monitorarPerfil();
}
