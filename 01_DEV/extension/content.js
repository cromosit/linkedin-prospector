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
function extrairExperiencia() {
  const dados = { company: '', current_role: '', current_company: '' };
  
  // Tenta pegar a primeira experiência
  const firstExp = document.querySelector('#experience ~ div .pvs-list__item--line-separated:first-child, .pv-top-card--experience-list li:first-child, .experience-section li:first-child');
  
  if (firstExp) {
    // Cargo geralmente é o primeiro texto em negrito
    const roleEl = firstExp.querySelector('.t-bold span[aria-hidden="true"], .pv-entity__summary-info h3');
    if (roleEl) dados.current_role = roleEl.innerText.trim();

    // Empresa
    const compEl = firstExp.querySelector('.t-14.t-normal span[aria-hidden="true"], .pv-entity__secondary-title');
    if (compEl) {
      let comp = compEl.innerText.trim();
      comp = comp.split(' · ')[0].trim(); // Remove tempo de empresa
      dados.current_company = comp;
      dados.company = comp;
    }
  }

  // Fallback para Headline
  if (!dados.company) {
    const headlineEl = document.querySelector('.text-body-medium.break-words') || document.querySelector('.pv-text-details__left-panel .text-body-medium');
    const headline = headlineEl?.innerText?.trim() || '';
    if (headline.includes(' · ')) dados.company = headline.split(' · ').pop().split('|')[0].trim();
    else if (headline.includes(' na ')) dados.company = headline.split(' na ').pop().split('|')[0].trim();
    else if (headline.includes(' at ')) dados.company = headline.split(' at ').pop().split('|')[0].trim();
  }

  return dados;
}

function extrairBasico() {
  const dados = { 
    name: '', 
    headline: '', 
    location: '', 
    company: '',
    current_role: '',
    current_company: '',
    about: '',
    linkedin_url: window.location.href.split('?')[0], 
    linkedin_id: window.location.href.split('/in/')[1]?.split('/')[0]?.replace('/', ''), 
    source: 'linkedin_profile' 
  };
  
  try {
    const nomeSelectors = ['h1.text-heading-xlarge','h1.inline.t-24','.pv-text-details__left-panel h1','.ph5 h1','main h1'];
    for (const sel of nomeSelectors) {
      const el = document.querySelector(sel);
      const txt = el?.innerText?.trim();
      if (txt && txt.length > 1 && txt.length < 80 && !txt.includes('•') && !txt.includes('º') && !txt.match(/^\d/)) {
        dados.name = txt; break;
      }
    }
    if (!dados.name) {
      dados.name = document.title.split('|')[0].split('-')[0].replace(' (Personal)', '').trim() || 'Lead Desconhecido';
    }

    const headlineSelectors = ['.text-body-medium.break-words','.pv-text-details__left-panel .text-body-medium','.ph5 .text-body-medium', '.pv-text-details__left-panel h2'];
    for (const sel of headlineSelectors) {
      const el = document.querySelector(sel);
      const txt = el?.innerText?.trim();
      if (txt && txt.length > 2) { 
        dados.headline = txt; break; 
      }
    }

    const locationSelectors = [
      '.pv-text-details__left-panel .pb2 span.text-body-small',
      '.ph5 .mt2 span.text-body-small',
      '.pv-top-card--list .pv-top-card--list-bullet span'
    ];
    for (const sel of locationSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const txt = el?.innerText?.trim();
        if (txt && txt.length > 3 && txt.length < 60 &&
            !txt.includes('conexões') && !txt.includes('seguidores')) {
          dados.location = txt; break;
        }
      }
      if (dados.location) break;
    }

    const exp = extrairExperiencia();
    dados.company = exp.company;
    dados.current_role = exp.current_role;
    dados.current_company = exp.current_company;
    
    // Sobre / Bio
    const aboutSelectors = ['#about ~ div .display-flex', '.pv-about-section .pv-shared-text-with-see-more', '.pv-about__summary-text'];
    for (const sel of aboutSelectors) {
       const el = document.querySelector(sel);
       if (el) {
          dados.about = el.innerText.trim();
          break;
       }
    }

    let grau = '3';
    const bodyTxt = (document.body.innerText || '').replace(/[·⋅∙•-]/g, '•');
    if (/•\s*1(st|º|°|a)/i.test(bodyTxt) || /\b1st degree\b/i.test(bodyTxt) || document.querySelector('.dist-value')?.innerText.includes('1')) {
      grau = '1';
    } else if (/•\s*2(nd|º|°|a)/i.test(bodyTxt) || /\b2nd degree\b/i.test(bodyTxt) || document.querySelector('.dist-value')?.innerText.includes('2')) {
      grau = '2';
    }
    dados.connection_degree = grau;
    
    // Conexões em comum
    const mutualMatch = bodyTxt.match(/(\d+)\s+conex[õo]es? em comum/i) || bodyTxt.match(/(\d+)\s+mutual connections?/i);
    if (mutualMatch) dados.mutual_connections = mutualMatch[1];

    const fotoSelectors = ['.pv-top-card-profile-picture__image--show','img.pv-top-card-profile-picture__image','img[class*="profile-picture"]'];
    for (const sel of fotoSelectors) {
      const el = document.querySelector(sel);
      if (el?.src && !el.src.includes('ghost') && el.src.startsWith('https')) { 
        dados.profile_picture = el.src; break; 
      }
    }
  } catch(e) {
    console.error('[Prospector] Erro no extrairBasico:', e);
  }
  return dados;
}

// 2️⃣ LÓGICA DE CAPTURA DOS CONTATOS (E-MAIL, FONE, SITE, ANIVERSÁRIO)
async function buscarContatos(dados) {
  if (!window.location.hash.includes('contact-info') && !document.querySelector('.artdeco-modal')) {
     const btn = document.querySelector('#top-card-text-details-contact-info, a[href*="/contact-info/"]');
     if (btn) {
       btn.click();
       await esperar(2000);
     }
  }

  const modal = document.querySelector('.artdeco-modal, .pv-contact-info, #artdeco-modal-outlet');
  
  if (modal || window.location.href.includes('contact-info')) {
    const container = modal || document.body;
    
    // Email
    const emailEl = container.querySelector('.ci-email a, a[href^="mailto:"]');
    if (emailEl) {
      dados.email = emailEl.href.replace('mailto:', '').split('?')[0].trim();
    } else {
      const m = container.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (m) dados.email = m[0];
    }
    
    // Fone
    const foneEl = container.querySelector('.ci-phone span.t-14, .ci-phone a, a[href^="tel:"]');
    if (foneEl) {
      dados.phone = foneEl.innerText.replace(/[^\d+]/g, '');
    } else {
      const m = container.innerText.match(/(?:telefone|phone)[\s\S]*?([\d\s()-]{8,20})/i);
      if (m) dados.phone = m[1].replace(/[^\d]/g, '');
    }
    
    // Website
    const siteEl = container.querySelector('.ci-websites a');
    if (siteEl && !siteEl.href.includes('linkedin.com')) dados.website = siteEl.href;
    
    // Birthday & Connected Since
    const sections = Array.from(container.querySelectorAll('section, .pv-contact-info__contact-type'));
    sections.forEach(s => {
      const t = s.innerText.toLowerCase();
      if (t.includes('aniversário') || t.includes('birthday')) {
        dados.birthday = s.querySelector('.pv-contact-info__contact-item, .pv-contact-info__header + *')?.innerText.trim();
      }
      if (t.includes('conexão desde') || t.includes('connected')) {
        dados.connected_since = s.querySelector('.pv-contact-info__contact-item, .pv-contact-info__header + *')?.innerText.trim();
      }
    });

    const closeBtn = document.querySelector('.artdeco-modal__dismiss, button.artdeco-button[aria-label*="Fechar"], button.artdeco-button[aria-label*="Close"]');
    if (closeBtn) closeBtn.click();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
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
  try {
    elemento.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    
    await esperar(300);
    
    try {
       document.execCommand('insertText', false, texto);
    } catch (e) { 
       const p = elemento.querySelector('p') || elemento;
       if (p) p.innerText = texto; 
    }
    
    await esperar(300);
    
    try { elemento.dispatchEvent(new Event('input', { bubbles: true })); } catch(e){}
    try { elemento.dispatchEvent(new Event('change', { bubbles: true })); } catch(e){}
    try { elemento.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); } catch(e){}
    try { elemento.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } catch(e){}
  } catch (err) {
    console.error('[Prospector] Erro na injeção de texto:', err);
  }
}

async function focarEEnviar(leadId) {
  await esperar(1000);
  
  let btnEnviar = null;
  for (let i = 0; i < 15; i++) {
    btnEnviar = document.querySelector(
      '.msg-form__send-button, ' +
      'button.msg-form__send-btn, ' +
      '.msg-overlay-conversation-bubble [type="submit"], ' +
      'button.artdeco-button--primary[type="submit"]'
    );
    
    if (btnEnviar && !btnEnviar.disabled) break;
    if (btnEnviar && btnEnviar.disabled) {
       try { btnEnviar.removeAttribute('disabled'); btnEnviar.disabled = false; } catch(e){}
    }
    
    await esperar(300);
  }
  
  if (btnEnviar) {
    try {
      btnEnviar.removeAttribute('disabled');
      btnEnviar.disabled = false;
    } catch(e){}
    
    await esperar(300);

    // Registra o sucesso na API primeiro e aguarda a conclusão antes de clicar e fechar a aba
    if (leadId) {
      await registrarSucessoEnvioPorId(leadId);
    }

    try {
      btnEnviar.click(); 
      exibirBanner('✅ MENSAGEM ENVIADA!', '#00c896'); 
    } catch(err) {
      console.error('[Prospector] Erro ao enviar mensagem:', err);
      exibirBanner('⚠️ Clique em Enviar manualmente!', '#ff9f0a');
    }
    await esperar(1500); 
    window.close(); 
  } else {
    exibirBanner('⚠️ Botão enviar não encontrado. Envie manualmente!', '#ff9f0a');
  }
}

async function automatizarChat(mensagem, leadId) {
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
    // Busca todos os possíveis elementos editáveis de chat e composable do LinkedIn
    const caixas = Array.from(document.querySelectorAll(
      '.msg-form__contenteditable, ' +
      '.msg-composable-form__contenteditable, ' +
      '.msg-composable-form__textarea, ' +
      '.msg-form__textarea, ' +
      '.msg-overlay-conversation-bubble [contenteditable="true"], ' +
      '[contenteditable="true"], ' +
      '[role="textbox"]'
    ));

    // Filtra para garantir que pegamos apenas o campo de corpo da mensagem
    caixa = caixas.find(el => {
      const label = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.innerText || '').toLowerCase();
      
      // Exclui campo de busca de contatos ("Para") e campo de assunto ("Assunto" / "Subject") com termos precisos para evitar falsos positivos com a sílaba 'to'
      const isExcluido = label === 'to' || label.startsWith('to:') || label.startsWith('to ') ||
                         label === 'para' || label.startsWith('para:') || label.startsWith('para ') ||
                         label.includes('digite um nome') || label.includes('type a name') ||
                         label.includes('pesquisa') || label.includes('destinatário') || 
                         label.includes('assunto') || label.includes('subject');
      
      // Deve possuir indicativos de que é a caixa de corpo/mensagem principal
      const isCorreto = label.includes('mensagem') || label.includes('message') || 
                        label.includes('escreva') || label.includes('escrever') ||
                        el.classList.contains('msg-form__contenteditable') || 
                        el.classList.contains('msg-composable-form__contenteditable') ||
                        el.classList.contains('msg-form__textarea') ||
                        el.closest('.msg-overlay-conversation-bubble') !== null ||
                        (el.getAttribute('contenteditable') === 'true' && !label);
      
      return isCorreto && !isExcluido;
    });

    if (caixa) break;
    await esperar(500);
  }

  if (caixa) { 
      caixa.focus();
      caixa.click();
      await esperar(800);
      await injetarTextoFormatado(caixa, mensagem); 
      await focarEEnviar(leadId); 
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
async function registrarSucessoEnvioPorId(leadId) {
    console.log('[Prospector] Iniciando registrarSucessoEnvioPorId para leadId:', leadId);
    if (!leadId) {
        console.warn('[Prospector] Nenhum leadId informado para registro.');
        return false;
    }
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: 'apiRequest',
            method: 'PUT',
            path: `/api/leads/${leadId}`,
            body: { status: 'contatado' }
        }, (res) => {
            console.log('[Prospector] Resposta da atualização de status para contatado:', res);
            if (res && res.sucesso) {
                console.log('[Prospector] Status do lead atualizado para "contatado". Registrando atividade...');
                exibirBanner('✅ STATUS DO LEAD ATUALIZADO PARA CONTATADO!', '#00c896');
                chrome.runtime.sendMessage({
                    action: 'apiRequest',
                    method: 'POST',
                    path: `/api/leads/${leadId}/atividades`,
                    body: { type: 'mensagem_enviada', description: `Mensagem enviada automaticamente via LinkedIn em ${new Date().toLocaleString()}` }
                }, (actRes) => {
                    console.log('[Prospector] Resposta do registro de atividade:', actRes);
                    resolve(true);
                });
            } else {
                const erroMsg = res?.erro || res?.data?.error || 'Erro desconhecido';
                console.error('[Prospector] Falha ao atualizar status do lead para "contatado":', erroMsg);
                if (res && res.status === 401) {
                    exibirBanner('⚠️ Erro 401 (Abra o CRM web para sincronizar o Token da Extensão)', '#ff3b5c');
                } else {
                    exibirBanner(`⚠️ Status não atualizou: ${erroMsg}`, '#ff9f0a');
                }
                resolve(false);
            }
        });
    });
}

// 7️⃣ EXTRAÇÃO DE MÚLTIPLOS PERFIS EM PÁGINA DE PESQUISA
function extrairListaDeBusca() {
  const leads = []
  const vistos = new Set()
  const blacklist = ['messaging','notifications','jobs','feed','mynetwork','search','company','school','groups','events','learning','premium','sales','recruiter','talent']

  let todosLinks = Array.from(document.querySelectorAll(
    '.entity-result__title-text a[href*="/in/"], ' +
    '.entity-result__title-line a[href*="/in/"], ' +
    '.entity-result__title a[href*="/in/"]'
  ))

  if (todosLinks.length === 0) {
    todosLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'))
  }

  todosLinks.forEach(link => {
    try {
      const href = link.href || ''
      if (!href.includes('/in/')) return
      const match = href.match(/\/in\/([a-zA-Z0-9_-]+)/)
      if (!match) return
      const linkedin_id = match[1]
      if (vistos.has(linkedin_id)) return
      if (blacklist.some(b => linkedin_id.includes(b))) return
      if (linkedin_id.length < 3) return

      if (link.closest('[class*="insight"]') || link.closest('[class*="mutual"]') || link.closest('.entity-result__simple-insight')) return

      const paiTexto = link.parentElement?.innerText || ''
      const avoTexto = link.parentElement?.parentElement?.innerText || ''
      if (paiTexto.includes('em comum') || avoTexto.includes('em comum') || 
          paiTexto.includes('mutual') || avoTexto.includes('mutual') ||
          paiTexto.includes('seguidor') || avoTexto.includes('seguidor') ||
          paiTexto.includes('shared') || avoTexto.includes('shared')) {
        return
      }

      const nomeSpan = link.querySelector('span[aria-hidden="true"]') || link.querySelector('span') || link
      let nomeTexto = nomeSpan.innerText?.trim() || link.innerText?.trim() || ''
      nomeTexto = nomeTexto.split('\n')[0].replace(/\s*•\s*\d+º(?: e \+)?/g, '').trim()
      if (!nomeTexto || nomeTexto.length < 2 || nomeTexto.toLowerCase().includes('linkedin') || nomeTexto.includes('•') || nomeTexto.includes('º')) {
        return
      }

      vistos.add(linkedin_id)

      const lead = { linkedin_id, linkedin_url: `https://www.linkedin.com/in/${linkedin_id}`, source: 'chrome_extension' }

      let card = link
      for (let i = 0; i < 12; i++) {
        card = card.parentElement
        if (!card || card.tagName === 'BODY') break
        if (card.className?.includes('result') || card.className?.includes('entity') ||
            card.className?.includes('reusable') || card.className?.includes('search') ||
            card.tagName === 'LI') break
      }
      if (!card || card.tagName === 'BODY') card = link.parentElement?.parentElement?.parentElement

      const textoCard = card?.innerText || ''

      lead.name = nomeTexto

      if (card) {
        const img = card.querySelector('img')
        if (img?.src && img.src.startsWith('https') && !img.src.includes('ghost') &&
            (img.src.includes('media') || img.src.includes('profile'))) {
          lead.profile_picture = img.src
        }
      }

      if (card) {
        const headlineSelectors = [
          '.entity-result__primary-subtitle',
          '.search-entity-result__primary-subtitle',
          '[class*="primary-subtitle"]',
          '[class*="subtitle--top"]',
          '.t-14.t-normal.t-black',
          '[class*="headline"]',
          '[class*="lockup__subtitle"]',
          '.t-14.t-black'
        ]
        for (const sel of headlineSelectors) {
          const el = card.querySelector(sel)
          const t = el?.innerText?.trim()
          if (t && t.length > 3 && t.length < 300 &&
              !t.includes('conex') && !t.includes('seguidor') && !t.includes('em comum') &&
              !t.match(/^[\u2022\u00b7]/) && !t.match(/^\d/) && !t.includes('grau')) {
            lead.headline = t; break
          }
        }
      }

      if (card) {
        const locSelectors = [
          '.entity-result__secondary-subtitle',
          '[class*="secondary-subtitle"]',
          '[class*="subline-level-2"]',
          '.t-12.t-black--light.t-normal'
        ]
        for (const sel of locSelectors) {
          const locEl = card.querySelector(sel)
          const lt = locEl?.innerText?.trim()
          if (lt && lt.length < 80 && !lt.includes('conex') && !lt.includes('seguidor') && !lt.includes('comum') && !lt.match(/^\d/)) {
            lead.location = lt; break
          }
        }
      }

      let grau = '3'
      const t = textoCard.replace(/[\u00b7\u22c5\u2219]/g, '\u2022')
      if (/\u2022\s*1[\u00bao\u00b0]/.test(t) || t.includes('1st') || t.includes('1º')) grau = '1'
      else if (/\u2022\s*2[\u00bao\u00b0]/.test(t) || t.includes('2nd') || t.includes('2º')) grau = '2'
      else if (/\u2022\s*3[\u00bao\u00b0]/.test(t) || t.includes('3rd') || t.includes('3º')) grau = '3'
      lead.connection_degree = grau

      const m = textoCard.match(/(\d+)\s+conex[õo]es? em comum/i)
      if (m) lead.mutual_connections = m[0]

      lead.temperature = lead.connection_degree === '1' ? 'quente' : lead.connection_degree === '2' ? 'morno' : 'frio'

      if (lead.headline && !lead.company) {
        if (lead.headline.includes(' · ')) lead.company = lead.headline.split(' · ').pop().trim()
        else if (lead.headline.includes(' na ')) lead.company = lead.headline.split(' na ').pop().split('|')[0].trim()
        else if (lead.headline.includes(' at ')) lead.company = lead.headline.split(' at ').pop().split('|')[0].trim()
      }

      leads.push(lead)
    } catch(e) {}
  })

  return leads
}

function detectarTipoPagina() {
  const url = window.location.href;
  if (url.includes('/search/results/')) return 'busca';
  if (url.includes('/in/')) return 'perfil';
  return 'outro';
}

// 7.5️⃣ LÓGICA DE SINCRONIZAÇÃO DO INBOX (LINKEDIN MESSAGING)
let lastInboxSync = 0;
function monitorarInbox() {
  if (!window.location.href.includes('/messaging/')) return;
  
  // Evita rodar muitas vezes (delay de 10 segundos entre syncs)
  if (Date.now() - lastInboxSync < 10000) return;
  lastInboxSync = Date.now();

  const conversationCards = document.querySelectorAll('.msg-conversation-card__participant-names, .msg-conversation-listitem__participant-names');
  if (!conversationCards || conversationCards.length === 0) return;

  const contacts = [];
  conversationCards.forEach(el => {
    const name = el.innerText.trim();
    if (name && name !== 'Você' && name !== 'You') {
      contacts.push({ name });
    }
  });

  if (contacts.length > 0) {
    chrome.runtime.sendMessage({
      action: 'apiRequest',
      method: 'POST',
      path: '/api/leads/sync-inbox',
      body: { contacts }
    }, (res) => {
      if (res && res.updated > 0) {
        exibirBanner(`✅ INBOX SYNC:\n${res.updated} lead(s) atualizaram para 'Respondeu' no CRM!`, '#00ffc8');
      }
    });
  }
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
  else if (request.action === 'extrairContatosDialog') {
    // Busca informações de contato (abre modal se necessário) antes de salvar
    (async () => {
      const dados = request.dados || extrairBasico();
      await buscarContatos(dados);
      sendResponse({ sucesso: true, dados });
    })();
    return true; // Mantém a porta aberta para resposta async
  }
  else if (request.action === 'extrairBusca') {
    const leads = extrairListaDeBusca();
    sendResponse({ sucesso: true, leads, total: leads.length });
  }
  return true;
});

function safeDecodeURIComponent(str) {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch (e) {
    try {
      return decodeURIComponent(str.replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
    } catch (err) {
      return str;
    }
  }
}

// INICIALIZAÇÃO E MONITORAMENTO SPA
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    
    const lpMsg = params.get('lp_msg');
    const lpAction = params.get('lp_action');
    const leadId = params.get('leadId') || params.get('lead_id') || params.get('lp_lead_id');
    
    // Se encontrou os parâmetros na URL no momento inicial, salva no storage local da extensão
    if (lpMsg) {
      chrome.storage.local.set({
        pending_msg: lpMsg,
        pending_action: lpAction || 'send_message',
        pending_leadId: leadId || ''
      });
    }
    
    if (leadId) {
      try { chrome.storage.local.set({ ultimoLeadIdMensagem: leadId }); } catch(e){}
    }

    // Função que executa após o carregamento do DOM estar pronto
    const iniciarExecucao = () => {
      // Detecção resiliente de perfil inexistente (Erro 404) no LinkedIn
      const isPage404 = window.location.href.includes('/404/') || 
                        document.title.includes('404') || 
                        document.body.innerText.includes('Esta página não existe') ||
                        document.body.innerText.includes('Page not found');

      if (isPage404) {
          console.warn('[Prospector] Perfil não encontrado no LinkedIn (404).');
          exibirBanner('❌ PERFIL NÃO ENCONTRADO (404)! Descartando lead no CRM...', '#ff3b5c');
          setTimeout(async () => {
            let storedId = null;
            try {
              storedId = await new Promise(res => {
                chrome.storage.local.get(['ultimoLeadIdMensagem'], data => res(data?.ultimoLeadIdMensagem));
              });
            } catch(e){}
            const targetId = leadId || storedId;
            
            if (targetId) {
                chrome.runtime.sendMessage({
                    action: 'apiRequest',
                    method: 'PUT',
                    path: `/api/leads/${targetId}`,
                    body: { status: 'descartado' }
                }, () => {
                    chrome.runtime.sendMessage({
                        action: 'apiRequest',
                        method: 'POST',
                        path: `/api/leads/${targetId}/atividades`,
                        body: { type: 'erro', description: `Tentativa de envio falhou: perfil não encontrado (URL 404) no LinkedIn.` }
                    }, () => {
                        setTimeout(() => window.close(), 2000);
                    });
                });
            } else {
                setTimeout(() => window.close(), 2000);
            }
          }, 1000);
          return;
      }

      // Tenta ler qualquer ação pendente que salvamos no storage
      chrome.storage.local.get(['pending_msg', 'pending_action', 'pending_leadId'], (data) => {
        if (data.pending_msg) {
          const m = safeDecodeURIComponent(data.pending_msg);
          const act = data.pending_action;
          const targetLeadId = data.pending_leadId || leadId;
          
          // Limpa do storage para não re-executar na navegação subsequente
          chrome.storage.local.remove(['pending_msg', 'pending_action', 'pending_leadId']);
          
          setTimeout(async () => {
            try {
              if (act === 'send_message') {
                  await automatizarChat(m, targetLeadId);
              }
              else if (act === 'connect') await automatizarConexao(m);
            } catch (errSetTimeout) {
              console.error('[Prospector] Erro no fluxo agendado:', errSetTimeout);
            }
          }, 2000);
        } else {
          // Monitoramento passivo SPA
          const monitorarSPA = () => {
            monitorarPerfil();
            monitorarInbox();
          };
          const observer = new MutationObserver(monitorarSPA);
          observer.observe(document.body, { childList: true, subtree: true });
          monitorarSPA();
        }
      });
    };

    // Executa no DOMContentLoaded se ainda estiver carregando, senão roda direto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciarExecucao);
    } else {
      iniciarExecucao();
    }

  } catch (errGlobalInit) {
    console.error('[Prospector] Falha crítica na inicialização:', errGlobalInit);
  }
})();
