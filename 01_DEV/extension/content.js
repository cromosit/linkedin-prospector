// content.js — LinkedIn Prospector DEV V1.0 (portado do v5.6 ULTRA)
// Aponta para localhost:3000 via background proxy

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

// Banner visual no LinkedIn
function exibirBanner(mensagem, cor = '#1a1a1a') {
    const id = 'lp-banner-dev';
    let banner = document.getElementById(id);
    if (!banner) {
        banner = document.createElement('div');
        banner.id = id;
        Object.assign(banner.style, {
            position: 'fixed', top: '24px', right: '24px', zIndex: '9999999',
            minWidth: '320px', padding: '16px 20px', borderRadius: '12px',
            backgroundColor: cor, color: '#FFFFFF', fontSize: '14px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex',
            alignItems: 'center', gap: '12px', letterSpacing: '-0.01em',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });
        document.body.appendChild(banner);
    }
    banner.style.backgroundColor = cor;
    banner.style.transform = 'translateX(0) scale(1)';
    const icone = mensagem.includes('✅') ? '🚀' : mensagem.includes('❌') ? '🛡️' : '🔭';
    banner.innerHTML = `
        <div style="font-size: 24px">${icone}</div>
        <div style="line-height: 1.4; font-weight: 600">[DEV] ${mensagem.replace('\n', '<br>')}</div>
    `;
    setTimeout(() => { banner.style.transform = 'translateX(150%) scale(0.9)'; }, 4500);
}

console.log('%c🏛️ LP PROSPECTOR DEV V1.0 ATIVADO!', 'color: #00ffc8; font-size: 20px; font-weight: bold;');
console.log('%c➡ Aponta para: http://localhost:3000', 'color: #3b82f6; font-size: 14px;');

// =====================================================
// 1. CAPTURA EM 2 LEVAS — PERFIL + DADOS DE CONTATO
// =====================================================
async function capturarPerfilIndividual() {
  let nome = document.querySelector('h1')?.innerText?.trim();
  if (!nome || nome.length < 3) nome = document.title.split('|')[0].trim();
  const primeiroNome = nome.split(' ')[0];

  // ── LEVA 1: Dados básicos do perfil ──────────────────────────────────
  exibirBanner(`🕵️ LEVA 1: Capturando ${primeiroNome}...`, '#1d8fe8');
  await esperar(1000);

  const headline   = document.querySelector('.text-body-medium.break-words')?.innerText?.trim() || '';
  const url        = window.location.href.split('?')[0];
  const location   = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText?.trim() || '';
  const company    = document.querySelector('.pv-text-details__right-panel .mr1 span')?.innerText?.trim() || '';

  // Grau de conexão (unicode robusto: 1º 2º 3º)
  let grau = '3';
  const grauEl  = document.querySelector('.dist-value, .pv-member-badge__text');
  const grauTxt = grauEl?.innerText || document.body.innerText;
  if (/[·•]\s*1[°º]/.test(grauTxt) || grauTxt.includes('• 1')) grau = '1';
  else if (/[·•]\s*2[°º]/.test(grauTxt) || grauTxt.includes('• 2')) grau = '2';
  else if (/1[°º]/.test(grauTxt)) grau = '1';
  else if (/2[°º]/.test(grauTxt)) grau = '2';

  const lead = {
    name: nome,
    headline,
    current_position: headline,
    current_company: company,
    company,
    linkedin_url: url,
    source: 'linkedin_profile',
    status: 'novo',
    connection_degree: grau,
    location
  };

  // Salva LEVA 1
  let leadId = null;
  try {
    const resp = await new Promise(resolve =>
      chrome.runtime.sendMessage({ action: 'save_lead', lead }, resolve)
    );
    if (chrome.runtime.lastError || !resp?.sucesso) {
      exibirBanner(`❌ LEVA 1 falhou: ${resp?.erro || 'Backend offline?'}`, '#ef4444');
      return;
    }
    leadId = resp.lead?.id;
    exibirBanner(`✅ LEVA 1 OK! ${nome}\nGrau ${grau}º · Buscando contatos...`, '#1d8fe8');
  } catch (e) {
    exibirBanner(`❌ LEVA 1 erro: ${e.message}`, '#ef4444');
    return;
  }

  // ── LEVA 2: Dados de contato (modal) ────────────────────────────────
  await esperar(1500);
  await capturarDadosContato(leadId);
}

// ─────────────────────────────────────────────────────
// LEVA 2: Abre modal "Dados de contato" e extrai tudo
// ─────────────────────────────────────────────────────
async function capturarDadosContato(leadId) {

  // ── Helper: aguarda elemento que contenha dados de contato ──────────────
  function aguardarModalContato(timeout) {
    return new Promise(resolve => {
      const SELS = [
        '.pv-contact-info',
        '[data-view-name="profile-contact-info"]',
        '[aria-label*="Dados de contato"]',
        '[aria-label*="Contact info"]',
        '.artdeco-modal__content',
        '.artdeco-modal',
        '[role="dialog"]',
      ];

      // Valida que o elemento é REALMENTE o modal de contatos
      // (não outro dialog do LinkedIn como cookies, notificações, etc.)
      const checarConteudo = (el) => {
        if (!el) return false;
        const txt = el.innerText || '';
        // Precisa conter pelo menos um dos marcadores de dados de contato
        return txt.includes('Telefone') ||
               txt.includes('E-mail') ||
               txt.includes('Conexão desde') ||
               txt.includes('Aniversário') ||
               txt.includes('Perfil') && txt.includes('linkedin.com') ||
               // Regex para número de telefone
               /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/.test(txt);
      };

      const encontrar = () => {
        for (const sel of SELS) {
          const el = document.querySelector(sel);
          if (checarConteudo(el)) return el;
        }
        return null;
      };

      // Checa se já existe (caso overlay já estivesse aberto)
      const existente = encontrar();
      if (existente) { resolve(existente); return; }

      // MutationObserver: escuta inserções no DOM
      const obs = new MutationObserver(() => {
        const found = encontrar();
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
    });
  }

  // ── 1. Encontra o link "Dados de contato" ──────────────────────────────
  let linkContato = null;
  for (let i = 0; i < 8; i++) {
    linkContato =
      document.querySelector('a[href*="contact-info"]') ||
      document.querySelector('a[href*="overlay/contact-info"]') ||
      Array.from(document.querySelectorAll('a')).find(a =>
        a.innerText?.includes('Dados de contato') ||
        a.innerText?.includes('Contact info')
      );
    if (linkContato) break;
    await esperar(500);
  }

  if (!linkContato) {
    exibirBanner('✅ Lead salvo!\n⚠️ Sem link "Dados de contato" neste perfil', '#f97316');
    return;
  }

  // ── 2. Clica e aguarda o modal correto ─────────────────────────────────
  linkContato.click();
  exibirBanner('📋 LEVA 2: Aguardando "Dados de contato"...', '#1d8fe8');

  let modalEncontrado = await aguardarModalContato(10000);

  // ── 3. Fallback: clica novamente + espera mais ──────────────────────────
  if (!modalEncontrado) {
    exibirBanner('⏳ Tentativa 2: clicando novamente...', '#f97316');
    linkContato.click();
    modalEncontrado = await aguardarModalContato(8000);
  }

  // ── 4. Fallback 2: já pode estar no /overlay/contact-info/ pela pushState anterior ──
  if (!modalEncontrado) {
    // Verifica se o conteúdo já está na página (sem modal, como overlay inline)
    const paginaTexto = document.body.innerText || '';
    if (paginaTexto.includes('Telefone') || paginaTexto.includes('Conexão desde')) {
      // Dados de contato estão na página diretamente
      modalEncontrado = document.body;
    }
  }

  if (!modalEncontrado) {
    exibirBanner('✅ Lead salvo!\n⚠️ Modal não carregou após 2 tentativas.\nAbra "Dados de contato" manualmente e recarregue a extensão.', '#f97316');
    return;
  }

  // ── 5. PARSER DE TEXTO BRUTO ────────────────────────────────────────────
  const linhas = (modalEncontrado.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);
  let phone = '', email = '', website = '', birthday = '', connected_since = '';

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    // Telefone: diversos formatos brasileiros
    // Formato (41)99892-0133 (Celular)
    if (!phone && l.match(/\(\d{2}\)\s*\d{4,5}[-\s.]?\d{4}/)) {
      phone = l.replace(/\s*\(Celular\).*|\s*\(Comercial\).*|\s*\(Trabalho\).*|\s*\(Residencial\).*/i, '').trim();
    }
    // Formato +55 41 99892-0133
    if (!phone && l.match(/^\+55\s*\d{2}\s*\d{4,5}[-\s]?\d{4}/)) {
      phone = l.replace(/\s*\(Celular\).*|\s*\(Comercial\).*/i, '').trim();
    }
    // Formato puro dígitos: 55996667723 (Celular) ou 41998920133
    if (!phone && l.match(/^\d{10,13}\s*(\(|$)/)) {
      phone = l.replace(/\s*\(Celular\).*|\s*\(Comercial\).*|\s*\(Trabalho\).*|\s*\(Residencial\).*|\s*\(Casa\).*/i, '').trim();
    }
    // Formato 55 99 66677-23 ou similar com espaços
    if (!phone && l.match(/^\d{2}\s+\d{2}\s+\d{4,5}[-\s]?\d{4}/)) {
      phone = l.replace(/\s*\(Celular\).*|\s*\(Comercial\).*/i, '').trim();
    }
    // E-mail
    if (!email && l.match(/^[\w._%+\-]+@[\w.\-]+\.[a-z]{2,}$/i)) {
      email = l;
    }
    // Website
    if (!website && l.match(/^(https?:\/\/|www\.)/i) && !l.includes('linkedin.com')) {
      website = l;
    }
    // Aniversário (ex: "6 de outubro") — SEM ano
    if (!birthday && l.match(/^\d{1,2} de \w+$/) && !l.match(/\d{4}/)) {
      birthday = l;
    }
    // Conexão desde (ex: "15 de dez de 2016")
    if (!connected_since && l.match(/\d{1,2} de \w+\.? de \d{4}/)) {
      connected_since = l;
    }
  }

  // ── 6. Fecha o modal ────────────────────────────────────────────────────
  const btnFechar =
    document.querySelector('button[aria-label*="echar"]') ||
    document.querySelector('button[aria-label*="Close"]') ||
    document.querySelector('button[aria-label*="Dismiss"]') ||
    document.querySelector('.artdeco-modal__dismiss') ||
    document.querySelector('[data-test-modal-close-btn]');
  if (btnFechar) btnFechar.click();

  // ── 7. Salva no CRM via PUT ──────────────────────────────────────────────
  const dadosContato = { phone, email, website, birthday, connected_since };
  Object.keys(dadosContato).forEach(k => { if (!dadosContato[k]) delete dadosContato[k]; });

  let resp = null;
  if (leadId && Object.keys(dadosContato).length > 0) {
    resp = await new Promise(resolve =>
      chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'PUT',
        path: `/leads/${leadId}`,
        body: dadosContato
      }, resolve)
    );
  }

  // ── 8. Banner de resultado ──────────────────────────────────────────────
  const resumo = [
    phone           ? `📞 ${phone}`              : '',
    email           ? `✉️ ${email}`               : '',
    birthday        ? `🎂 ${birthday}`            : '',
    connected_since ? `🤝 Desde ${connected_since}` : ''
  ].filter(Boolean);

  if (resumo.length === 0) {
    exibirBanner('✅ Lead salvo!\n⚠️ Modal aberto mas sem dados públicos\n(configure sua privacidade no LinkedIn)', '#f97316');
  } else if (resp?.sucesso || !leadId) {
    exibirBanner(`✅ LEVA 2 OK! Contatos salvos:\n${resumo.join('\n')}`, '#00c896');
  } else {
    exibirBanner(`⚠️ Dados extraídos mas erro ao salvar:\n${resp?.erro || 'Erro'}\n${resumo.join(', ')}`, '#f97316');
  }
}

// =====================================================

// 2. CAPTURA EM MASSA (lista de busca /search/)
// =====================================================
function extrairListaDeBusca() {
  const leads = [];
  const seen = new Set();
  
  // LinkedIn search results are always inside an unordered list
  const listItems = document.querySelectorAll('ul li');
  
  listItems.forEach(li => {
    try {
      // Find the main profile link in this list item
      const linkEl = li.querySelector('a[href*="/in/"]');
      if (!linkEl) return;
      
      const linkedin_url = linkEl.href.split('?')[0];
      if (!linkedin_url || seen.has(linkedin_url)) return;
      
      // Get all raw text lines inside the card
      const rawText = li.innerText || '';
      const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (lines.length < 3) return; // Too little info to be a valid card
      
      // Heuristic to find the Name
      // Normally, the first text that isn't a degree indicator or a badge is the name
      let name = '';
      for (const line of lines) {
        // Skip purely connection degree lines
        if (line === '1º' || line === '2º' || line === '3º' || line === '• 1°') continue;
        // Skip tags like "Novo" or generic words
        if (line.toLowerCase() === 'novo' || line.toLowerCase() === 'new') continue;
        
        name = line;
        break;
      }
      
      // Clean up the name string (removes trailing badges or connection degrees)
      name = name.split('•')[0].trim();
      name = name.replace(/1º|2º|3º|1st|2nd|3rd/g, '').trim();
      name = name.replace(/[\u{1F3A8}-\u{1F9FF}]|[\u2600-\u26FF]|[\u2700-\u27BF]|🔵|✅|🟢|📷/gu, '').trim();
      
      if (!name || name.length < 2 || ['mensagem', 'ver perfil', 'connect'].includes(name.toLowerCase())) return;
      
      seen.add(linkedin_url);
      
      // Degree
      let connection_degree = '3';
      if (rawText.includes('1º') || rawText.includes('1st') || rawText.includes('1°')) connection_degree = '1';
      else if (rawText.includes('2º') || rawText.includes('2nd') || rawText.includes('2°')) connection_degree = '2';
      
      // Headline and Location
      let headline = '';
      let location = '';
      
      // Search for headline and location in the remaining lines
      let nameFound = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(name)) {
          nameFound = true;
          continue;
        }
        
        if (nameFound) {
          // Skip degree lines that appear after
          if (line === '1º' || line === '2º' || line === '3º' || line.startsWith('•')) continue;
          if (line.toLowerCase().includes('mensagem') || line.toLowerCase().includes('conectar')) continue;
          
          if (!headline) {
            headline = line;
          } else if (!location && line !== headline) {
            // Location is often the next line or contains commas
            location = line;
            break; // Stop parsing after finding both
          }
        }
      }
      
      // If we only found a headline that looks like a location
      if (headline && headline.includes(',') && !headline.includes('|') && !location) {
        location = headline;
        headline = '';
      }
      
      leads.push({
        name,
        linkedin_url,
        headline,
        location,
        connection_degree,
        source: 'linkedin_search',
        status: 'novo'
      });
      
    } catch (e) {
      console.error('[LP] Erro parseando card', e);
    }
  });

  // Fallback for extreme cases where UL > LI structure is completely gone
  if (leads.length === 0) {
    const backupLinks = document.querySelectorAll('a.app-aware-link[href*="/in/"]');
    // Implement minimal fallback if needed, but the UL>LI logic above usually catches the new React layout
  }

  console.log(`[DEV V1.3.2] Extraídos ${leads.length} leads da busca baseados em parse de texto`);
  return leads;
}

// =====================================================
// 3. TIPOS DE MENSAGEM (chat + conexão)
// =====================================================
async function injetarTextoFormatado(elemento, texto) {
  elemento.focus();
  
  // Limpa o conteúdo original
  const p = elemento.querySelector('p') || elemento;
  p.innerHTML = '';
  
  // LinkedIn requer que a DataTransfer registre text/plain e text/html para enganar o React Draft.js
  try {
    const dt = new DataTransfer();
    dt.setData('text/plain', texto);
    const ev = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true
    });
    elemento.dispatchEvent(ev);
  } catch(e) {}
  
  await esperar(200);
  
  if ((p.innerText || elemento.innerText || '').trim().length < 5) {
      try { document.execCommand('insertText', false, texto); } catch(e){}
  }
  
  await esperar(300);
  
  if ((p.innerText || elemento.innerText || '').trim().length < 5) {
      p.innerText = texto;
  }
  
  // Essencial para o React perceber que o campo não está vazio
  elemento.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  elemento.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

async function focarEEnviar() {
  // Retry para encontrar o botão ENVIAR do chat (dentro da bubble, não o botão do perfil)
  for (let i = 0; i < 8; i++) {
    const btnEnviar =
      document.querySelector('.msg-form__send-button') ||
      document.querySelector('button.msg-form__send-btn') ||
      document.querySelector('.msg-overlay-conversation-bubble button[type="submit"]') ||
      // IMPORTANTE: EXCLUI o botão "Enviar mensagem" do perfil (aria-label*="Enviar mensagem")
      // Busca especificamente botões dentro do formulário de chat
      document.querySelector('.msg-form button[type="submit"]') ||
      document.querySelector('.msg-overlay-list-bubble button[type="submit"]') ||
      Array.from(document.querySelectorAll('.msg-overlay-conversation-bubble button, .msg-form button')).find(b =>
        b.type === 'submit' ||
        (b.getAttribute('aria-label') || '').toLowerCase().includes('send') ||
        (b.innerText?.trim().toLowerCase() === 'enviar')
      );
    if (btnEnviar && !btnEnviar.disabled) {
      btnEnviar.click();
      exibirBanner('✅ MENSAGEM ENVIADA!', '#00c896');
      await esperar(1500);
      return true;
    }
    await esperar(800);
  }
  exibirBanner('⚠️ Mensagem digitada mas botão Enviar não clicado. Pressione Enter.', '#f97316');
  return false;
}

async function automatizarChat(mensagem) {
  // Guard: evita envio duplicado se content.js re-inicializar na mesma sessão
  if (window._LP_MSG_SENT) {
    console.log('[LP] Envio já realizado nesta sessão, ignorando duplicata.');
    return;
  }
  window._LP_MSG_PROCESSING = true;

  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0].trim()).split(' ')[0];
  exibirBanner(`🚀 MODO ENVIO: Preparando chat com ${nomeExibicao}...`, '#1d8fe8');

  // Aguarda a página carregar completamente
  await esperar(2000);

  // ── PASSO 1: Clicar no botão 'Enviar mensagem' com retry ───────────────
  let btnMsg = null;
  for (let i = 0; i < 12; i++) {
    btnMsg =
      document.querySelector('button[aria-label*="Enviar mensagem"]') ||
      document.querySelector('button[aria-label*="Send message"]') ||
      document.querySelector('button[aria-label*="Message"]') ||
      Array.from(document.querySelectorAll('button')).find(b => {
        const txt = (b.innerText?.trim() || '').toLowerCase();
        const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
        return txt.includes('enviar mensagem') ||
               txt.includes('send message') ||
               lbl.includes('enviar mensagem') ||
               lbl.includes('send message') ||
               (txt === 'message' && b.closest('.pvs-profile-actions, .pv-top-card-v2-ctas, .ph5'));
      }) ||
      document.querySelector('[data-control-name="message"]');
    if (btnMsg) break;
    await esperar(700);
  }

  // ── Se estamos na página /messaging/compose/ (veio do CRM via URL), pula o clique do botão ──
  const naCompose = window.location.href.includes('/messaging/compose') ||
                    window.location.href.includes('/messaging/thread');
  
  if (!btnMsg && !naCompose) {
    // Fallback: navega para compose NA MESMA ABA
    const slug = window.location.pathname.match(/\/in\/([^\/]+)/)?.[1];
    if (slug) {
      exibirBanner('⏳ Abrindo chat via URL direta...', '#f97316');
      window.location.href = `https://www.linkedin.com/messaging/compose/?recipient=${slug}&lp_msg=${encodeURIComponent(mensagem)}&lp_action=send_message`;
      // content.js será re-injetado e lp_msg dispara automatizarChat novamente
      return;
    }
    exibirBanner('❌ Não foi possível identificar o perfil para enviar mensagem.', '#ef4444');
    return;
  }

  // Se achou o botão no perfil, clica para abrir overlay de chat
  if (btnMsg && !naCompose) {
    const chatJaAberto = document.querySelector('.msg-overlay-conversation-bubble, .msg-form__contenteditable');
    if (!chatJaAberto) {
      btnMsg.click();
      exibirBanner(`💬 Chat abrindo com ${nomeExibicao}...`, '#1d8fe8');
      await esperar(3000);
    }
  }

  // ── PASSO 2: Encontrar a caixa de texto com retry ────────────────────
  let caixa = null;
  for (let i = 0; i < 15; i++) {
    caixa =
      document.querySelector('.msg-form__contenteditable[contenteditable="true"]') ||
      document.querySelector('.msg-overlay-conversation-bubble [contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"][role="textbox"]') ||
      document.querySelector('.msg-form__textarea') ||
      // Na página de compose, o textbox pode ter classes diferentes
      document.querySelector('.msg-conversations-container__convo [contenteditable="true"]') ||
      document.querySelector('.msg-compose [contenteditable="true"]') ||
      Array.from(document.querySelectorAll('[contenteditable="true"]')).find(el => {
        const lbl = (el.getAttribute('aria-label') || '').toLowerCase();
        const ph = (el.getAttribute('placeholder') || '').toLowerCase();
        return lbl.includes('mensagem') || lbl.includes('message') || 
               ph.includes('mensagem') || ph.includes('message') ||
               el.getAttribute('role') === 'textbox';
      });
    if (caixa) break;
    await esperar(800);
  }

  // ── PASSO 3: Digitar e enviar ────────────────────────────────────────
  if (caixa) {
    caixa.focus();
    caixa.click();
    await esperar(600);
    await injetarTextoFormatado(caixa, mensagem);
    await esperar(1000);

    // Procura botão de enviar (no compose e no overlay são diferentes)
    let btnSend = null;
    
    // Tenta achar o botão e aguarda ele ficar habilitado (React pode demorar)
    for (let retry = 0; retry < 10; retry++) {
      btnSend =
        document.querySelector('.msg-form__send-button') ||
        document.querySelector('button.msg-form__send-btn') ||
        document.querySelector('.msg-form button[type="submit"]') ||
        document.querySelector('.msg-overlay-conversation-bubble button[type="submit"]') ||
        Array.from(document.querySelectorAll('button')).find(b => {
          const txt = (b.innerText?.trim() || '').toLowerCase();
          const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
          return (txt === 'enviar' || txt === 'send') ||
                 lbl.includes('send') || lbl.includes('enviar') ||
                 (b.type === 'submit' && b.closest('.msg-form, .msg-compose, .msg-connections-container'));
        });

      if (btnSend && !btnSend.disabled && !btnSend.hasAttribute('disabled')) {
        // Ignora se for o botão das configurações "Pressione Enter para enviar" e não o de enviar "real"
        if (!btnSend.getAttribute('aria-label')?.includes('Pressione')) break;
      }
      
      // Se não achou ou está desabilitado, força um input event para o React atualizar
      caixa.focus();
      caixa.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      await esperar(300);
    }

    if (btnSend && !btnSend.disabled && !btnSend.hasAttribute('disabled') && !btnSend.hasAttribute('aria-hidden')) {
      // Simulated full mouse click lifecycle
      const evOpts = { bubbles: true, cancelable: true, view: window };
      btnSend.dispatchEvent(new MouseEvent('mouseover', evOpts));
      btnSend.dispatchEvent(new MouseEvent('mousedown', evOpts));
      btnSend.dispatchEvent(new MouseEvent('mouseup', evOpts));
      btnSend.click();
      
      window._LP_MSG_SENT = true; // Marca como enviado para evitar duplicata
      exibirBanner('✅ MENSAGEM ENVIADA com sucesso pelo botão!', '#00c896');
      // Limpa lp_msg da URL para evitar re-envio em navegação SPA
      try { window.history.replaceState({}, '', window.location.pathname); } catch(e) {}
    } else {
      // Configuração oculta (o menu dos 3 pontinhos mostra "Pressione Enter" ou "Clique Enviar")
      const configOpcao = Array.from(document.querySelectorAll('label')).find(l => l.innerText.includes('Clique Enviar'));
      if (configOpcao) { 
          try { configOpcao.click(); await esperar(400); } catch(e){}
      }
      
      // Manda Enter
      caixa.focus();
      const reactEvents = [
        new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13, bubbles: true, cancelable: true }),
        new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13, bubbles: true, cancelable: true }),
        new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertLineBreak' }),
        new KeyboardEvent('keyup',  { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13, bubbles: true, cancelable: true })
      ];
      
      for (const ev of reactEvents) {
        caixa.dispatchEvent(ev);
        await esperar(50);
      }
      
      window._LP_MSG_SENT = true;
      exibirBanner('✅ MENSAGEM ENVIADA! (Enter simulado forçado).', '#f97316');
      try { window.history.replaceState({}, '', window.location.pathname); } catch(e) {}
    }
  } else {
    exibirBanner('❌ ERRO: Caixa de chat não encontrada!\nTente dar F5 na página e usar o botão novamente.', '#ef4444');
  }
}




async function aguardarElemento(sel, timeout) {
  return new Promise(res => {
    const el = document.querySelector(sel); if (el) return res(el);
    const obs = new MutationObserver(() => { const v = document.querySelector(sel); if (v) { obs.disconnect(); res(v); } });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); res(null); }, timeout);
  });
}

// =====================================================
// 4. BOTÃO FLUTUANTE em perfis (/in/)
// =====================================================
function monitorarPerfil() {
  if (!window.location.href.includes('/in/')) return;
  if (document.getElementById('lp-btn-float-dev')) return;

  let nome = document.querySelector('h1')?.innerText.trim();
  if (!nome) nome = document.title.split('|')[0].trim();

  if (nome && !nome.includes('LinkedIn')) {
    const btn = document.createElement('button');
    btn.id = 'lp-btn-float-dev';
    btn.innerHTML = `<span>⚡</span> Capturar <b>${nome.split(' ')[0]}</b>`;
    btn.style.cssText = `position:fixed;bottom:30px;right:30px;z-index:9999999;background:#1d8fe8;color:white;border:none;padding:18px 28px;border-radius:50px;font-weight:800;cursor:pointer;box-shadow:0 15px 45px rgba(29,143,232,0.5);border:3px solid white;font-family:Inter,sans-serif;font-size:16px;display:flex;align-items:center;gap:10px;transition:all 0.3s;`;
    btn.onmouseover = () => btn.style.transform = 'scale(1.05) translateY(-5px)';
    btn.onmouseout = () => btn.style.transform = 'scale(1) translateY(0)';
    btn.onclick = capturarPerfilIndividual;
    document.body.appendChild(btn);
    console.log(`[DEV V1] ✅ Botão injetado para: ${nome}`);
  }
}

// =====================================================
// 5. LISTENER DE MENSAGENS DO POPUP/BACKGROUND
// =====================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // CAPTURAR LISTA DE BUSCA
  if (request.action === 'capturar_busca' || request.action === 'extrairBusca') {
    const leads = extrairListaDeBusca();
    if (leads.length === 0) {
      sendResponse({ success: false, error: 'Nenhum lead encontrado. Role a página e tente novamente.' });
      return true;
    }
    exibirBanner(`📡 Enviando ${leads.length} leads para o CRM...`, '#1d8fe8');
    chrome.runtime.sendMessage({ action: 'save_bulk', leads }, (resp) => {
      if (resp?.sucesso) {
        exibirBanner(`✅ ${leads.length} leads salvos no CRM!`, '#00c896');
        sendResponse({ success: true, message: `${leads.length} leads capturados!` });
      } else {
        exibirBanner(`❌ Falha: ${resp?.erro}`, '#ef4444');
        sendResponse({ success: false, error: resp?.erro || 'Erro ao salvar. Backend rodando?' });
      }
    });
    return true;
  }

  // CAPTURAR PERFIL INDIVIDUAL
  if (request.action === 'capturar_perfil') {
    capturarPerfilIndividual().then(() => {
      sendResponse({ success: true, message: 'Captura iniciada!' });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // ENVIAR MENSAGEM VIA AUTOMAÇÃO
  if (request.action === 'send_message' && request.message) {
    automatizarChat(request.message);
    sendResponse({ success: true });
    return true;
  }

  return true;
});

// =====================================================
// 6. INICIALIZAÇÃO (params de URL do CRM)
// =====================================================
const params = new URLSearchParams(window.location.search);
if (params.get('lp_msg') && !window._LP_MSG_SENT) {
  const m = decodeURIComponent(params.get('lp_msg'));
  const act = params.get('lp_action');
  // Na página de compose, o LinkedIn demora mais para renderizar o textbox
  const isCompose = window.location.href.includes('/messaging/');
  const delay = isCompose ? 4000 : 2000;
  setTimeout(async () => {
    if (act === 'send_message' && !window._LP_MSG_SENT) await automatizarChat(m);
  }, delay);
} else {
  // Observer para SPA do LinkedIn (muda URL sem reload)
  const observer = new MutationObserver(monitorarPerfil);
  observer.observe(document.body, { childList: true, subtree: true });
  monitorarPerfil();
}
