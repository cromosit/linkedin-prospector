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
    dados.headline = document.querySelector('.pv-text-details__left-panel .text-body-medium, .text-body-medium.break-words, .pv-top-card-layout__headline')?.innerText.trim() || '';
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
      dados.email = emailEl.href.replace('mailto:', '').split('?')[0].trim();
    } else {
      const emailMatch = container.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) dados.email = emailMatch[0];
    }
    
    // 2. Extração de Telefone (por link tel ou regex com limpeza)
    const foneEl = container.querySelector('a[href^="tel:"]');
    if (foneEl) {
      let telRaw = decodeURIComponent(foneEl.href.replace('tel:', '')).trim();
      dados.phone = telRaw.replace(/[^\d+]/g, '');
    } else {
      const text = container.innerText;
      const phoneMatch = text.match(/(?:telefone|phone|celular|mobile)[\s\S]*?([\d\s()-]{8,20})/i) || 
                         text.match(/(\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4})/);
      if (phoneMatch) {
        dados.phone = phoneMatch[1].replace(/[^\d]/g, '');
      }
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

  // 1. Busca o botão "Adicionar nota" de forma resiliente
  let btnNota = null;
  for (let i = 0; i < 12; i++) {
    btnNota = document.querySelector('button[aria-label="Adicionar nota"], button[aria-label^="Add a note"]') || 
              Array.from(document.querySelectorAll('button')).find(b => {
                const txt = b.innerText.trim().toLowerCase();
                return txt === 'adicionar nota' || txt === 'add a note';
              });
    if (btnNota) break;
    await esperar(500);
  }

  if (btnNota) {
    btnNota.click();
    console.log('[Prospector] Botão Adicionar Nota clicado. Aguardando textarea...');
    
    // 2. Aguarda a caixa de texto da nota abrir
    let textarea = null;
    for (let i = 0; i < 10; i++) {
      textarea = document.querySelector('textarea[name="message"], textarea, #custom-message');
      if (textarea) break;
      await esperar(300);
    }

    if (textarea) {
      // Limita a 200 caracteres para evitar estouro de limite da nota de convite do LinkedIn
      textarea.value = mensagem.length > 200 ? mensagem.substring(0, 197) + '...' : mensagem;
      textarea.dispatchEvent(new Event('input', { bubbles: true })); 
      await esperar(1000);
      
      // 3. Busca o botão de enviar de forma resiliente
      let btnEnviar = document.querySelector('button[aria-label="Enviar agora"], button[aria-label^="Send now"]') || 
                        Array.from(document.querySelectorAll('button')).find(b => {
                          const txt = b.innerText.trim().toLowerCase();
                          return txt === 'enviar' || txt === 'enviar agora' || txt === 'send' || txt === 'send now';
                        });

      if (btnEnviar) {
        btnEnviar.click(); 
        exibirBanner('✅ CONEXÃO ENVIADA COM SUCESSO!', '#00c896'); 
        await esperar(1500); 
        window.close();
      } else {
        exibirBanner('⚠️ Botão de enviar nota não encontrado. Envie manualmente!', '#ff9f0a');
      }
    } else {
      exibirBanner('⚠️ Campo de texto da nota não encontrado!', '#ff9f0a');
    }
  } else { 
    // Fallback caso não ache o botão de nota: tenta enviar no chat convencional
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
async function registrarSucessoEnvio(p) {
    const leadId = p.get('leadId');
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

// 7️⃣ EXTRAÇÃO DE MÚLTIPLOS PERFIS EM PÁGINA DE PESQUISA
function extrairListaDeBusca() {
  const leads = [];
  const vistos = new Set();
  const blacklist = ['messaging','notifications','jobs','feed','mynetwork','search','company','school','groups','events','learning','premium','sales','recruiter','talent'];
  const todosLinks = document.querySelectorAll('a[href*="/in/"]');

  todosLinks.forEach(link => {
    try {
      const href = link.href || '';
      if (!href.includes('/in/')) return;
      const match = href.match(/\/in\/([a-zA-Z0-9_-]+)/);
      if (!match) return;
      const linkedin_id = match[1];
      if (vistos.has(linkedin_id)) return;
      if (blacklist.some(b => linkedin_id.includes(b))) return;
      if (linkedin_id.length < 3) return;
      vistos.add(linkedin_id);

      const lead = { linkedin_id, linkedin_url: `https://www.linkedin.com/in/${linkedin_id}`, source: 'chrome_extension' };
      let container = link;

      for (let i = 0; i < 10; i++) {
        container = container.parentElement;
        if (!container || container.tagName === 'BODY') break;
        const texto = container.innerText || '';

        if (!lead.name) {
          const nomeSpan = link.querySelector('span[aria-hidden="true"]') || link.querySelector('span');
          const nomeTexto = nomeSpan?.innerText?.trim() || link.innerText?.trim();
          if (nomeTexto && nomeTexto.length > 1 && nomeTexto.length < 80 && !nomeTexto.includes('•') && !nomeTexto.includes('º')) lead.name = nomeTexto;
        }

        if (!lead.headline) {
          const subs = container.querySelectorAll('[class*="subtitle"],[class*="headline"],.t-14.t-black');
          subs.forEach(s => { const t = s.innerText?.trim(); if (t && t.length > 3 && t.length < 200 && !lead.headline && !t.includes('conexões') && !t.includes('seguidores') && !t.includes('•')) lead.headline = t; });
        }

        if (!lead.profile_picture) {
          const img = container.querySelector('img');
          if (img?.src && img.src.startsWith('https') && !img.src.includes('ghost') && (img.src.includes('media') || img.src.includes('profile'))) lead.profile_picture = img.src;
        }

        if (!lead.connection_degree) {
          if (texto.includes('• 1º')||texto.includes('1st')) lead.connection_degree='1';
          else if (texto.includes('• 2º')||texto.includes('2nd')) lead.connection_degree='2';
          else if (texto.includes('3º e +')||texto.includes('3rd')||texto.includes('• 3')) lead.connection_degree='3';
        }

        if (!lead.mutual_connections) { const m = texto.match(/(\d+)\s+conex[õo]es? em comum/i); if (m) lead.mutual_connections = m[0]; }

        if (!lead.location) {
          const locMatch = texto.match(/([A-ZÀ-Ü][a-zà-ü]+(?: [A-ZÀ-Ü][a-zà-ü]+)*,\s*(?:Brasil|[A-Z][a-zà-ü]+(?: [A-ZÀ-Ü][a-zà-ü]+)*))/u);
          if (locMatch && !locMatch[0].includes('Jacinto') && locMatch[0].length < 50) lead.location = locMatch[0];
        }

        if (lead.name && lead.connection_degree) break;
      }

      if (!lead.name || lead.name.length < 2) return;
      if (lead.name.toLowerCase().includes('linkedin')) return;
      if (lead.name.includes('•') || lead.name.includes('º')) return;

      if (lead.headline && !lead.company) {
        if (lead.headline.includes(' · ')) lead.company = lead.headline.split(' · ').pop().trim();
        else if (lead.headline.includes(' na ')) lead.company = lead.headline.split(' na ').pop().split('|')[0].trim();
        else if (lead.headline.includes(' at ')) lead.company = lead.headline.split(' at ').pop().split('|')[0].trim();
      }

      lead.connection_degree = lead.connection_degree || '3';
      lead.temperature = lead.connection_degree === '1' ? 'quente' : lead.connection_degree === '2' ? 'morno' : 'frio';
      leads.push(lead);
    } catch(e) {}
  });

  return leads;
}

function detectarTipoPagina() {
  const url = window.location.href;
  if (url.includes('/search/results/')) return 'busca';
  if (url.includes('/in/')) return 'perfil';
  return 'outro';
}

// 8️⃣ LISTENER DE COMUNICACAO INTERNA DA EXTENSAO
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectarPagina') {
    const tipo = detectarTipoPagina();
    let preview = null;
    if (tipo === 'perfil') {
      preview = { name: (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim() };
    } else if (tipo === 'busca') {
      const leads = extrairListaDeBusca();
      preview = { total: leads.length };
    }
    sendResponse({ tipo, preview });
    return true;
  }
  if (request.action === 'extrairPerfil') {
    const dados = extrairBasico();
    sendResponse({ sucesso: true, dados });
  }
  else if (request.action === 'extrairBusca') {
    const leads = extrairListaDeBusca();
    sendResponse({ sucesso: true, leads, total: leads.length });
  }
  return true;
});

// INICIALIZAÇÃO E MONITORAMENTO SPA
(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lp_msg')) {
      const m = decodeURIComponent(params.get('lp_msg'));
      const act = params.get('lp_action');
      setTimeout(async () => {
        if (act === 'send_message') {
            await automatizarChat(m);
            await registrarSucessoEnvio(params);
        }
        else if (act === 'connect') await automatizarConexao(m);
      }, 2000);
  } else {
      const observer = new MutationObserver(monitorarPerfil);
      observer.observe(document.body, { childList: true, subtree: true });
      monitorarPerfil();
  }
})();
