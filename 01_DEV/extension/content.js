// ==========================================
// TESTE DE CONEXÃO (Grito Visual)
// ==========================================
(function() {
  const banner = document.createElement('div');
  banner.id = 'lp-test-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#0088ff;color:white;text-align:center;z-index:100000;font-size:12px;padding:4px;font-weight:bold;';
  banner.innerText = '🚀 LinkedIn Prospector: Ativo e Pronto!';
  document.body.prepend(banner);
  setTimeout(() => banner.remove(), 4000);
})();

// content.js — LinkedIn Prospector v7
// Extração completa: empresa da Experiência, localização correta,
// informações de contato, sobre, e dados para IA preencher campos

// ==========================================
// EXTRAI PERFIL INDIVIDUAL COMPLETO
// ==========================================
async function extrairPerfilIndividualCompleto() {
  const dados = { name: '', headline: '', location: '', company: '', current_role: '', current_company: '', linkedin_url: window.location.href.split('?')[0], source: 'chrome_extension' }

  try {
    // 1. NOME (Multicamadas)
    const nomeEl = document.querySelector('.text-heading-xlarge, h1.text-heading-xlarge, main h1, .ph5 h1, [class*="text-heading-xlarge"], h1')
    if (nomeEl) {
      let txt = (nomeEl.innerText || nomeEl.textContent || '').trim()
      dados.name = txt.split('\n')[0].replace(/·\s*[123][ºostndrd]+/gi, '').replace(/\s+[123][ºostndrd]+/gi, '').trim()
    }
    
    if (!dados.name) {
      const title = document.title;
      if (title && title.includes('|')) dados.name = title.split('|')[0].split('-')[0].trim();
    }
  } catch(e) { console.warn('Erro nome:', e) }

  try {
    // 2. HEADLINE (Multicamadas)
    const headlineEl = document.querySelector('.text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium, .ph5 .text-body-medium, [class*="text-body-medium"]')
    if (headlineEl) dados.headline = headlineEl.innerText.trim()
  } catch(e) {}

  try {
    // 3. LOCALIZAÇÃO (Multicamadas + Aspirador de Texto)
    const locEl = document.querySelector('.pv-text-details__left-panel .pb2 span.text-body-small, .ph5 .mt2 span.text-body-small, [class*="text-body-small"]')
    if (locEl) dados.location = locEl.innerText.trim()
    
    // Fallback: Busca por estrutura de "Cidade, Estado" ou "Brasil" no topo
    if (!dados.location || dados.location.length < 3) {
      const topCard = document.querySelector('.pv-top-card, main section:first-child')
      if (topCard) {
        const text = topCard.innerText || ''
        const lines = text.split('\n').map(l => l.trim())
        const locIndex = lines.findIndex(l => l.includes(', Brazil') || l.includes(', Brasil') || l.includes('Área de') || l.includes('Greater'))
        if (locIndex !== -1) dados.location = lines[locIndex]
      }
    }
  } catch(e) {}

  try {
    // 4. EXPERIÊNCIA ATUAL (Foco Total)
    const exp = extrairExperienciaAtual()
    dados.current_role = exp.role
    dados.current_company = exp.company
    dados.company = exp.company || extrairEmpresaDaExperiencia()
  } catch(e) {}

  try {
    // 5. FOTO
    const fotoEl = document.querySelector('.pv-top-card-profile-picture__image--show, img.pv-top-card-profile-picture__image, img[class*="profile-picture"]')
    if (fotoEl?.src && !fotoEl.src.includes('ghost')) dados.profile_picture = fotoEl.src
  } catch(e) {}

  try {
    // 6. SOBRE / BIO
    dados.about = extrairSobre()
  } catch(e) {}

  try {
    // 7. DADOS SOCIAIS
    const bodyTxt = (document.body.innerText || '').replace(/[·⋅∙•]/g, '•')
    const mutualMatch = bodyTxt.match(/(\d+)\s+conex[õo]es? em comum/i)
    if (mutualMatch) dados.mutual_connections = mutualMatch[0]
    
    const segMatch = bodyTxt.match(/([\d.,]+)\s+seguidores?/i)
    if (segMatch) dados.followers = segMatch[0]

    // DETECÇÃO INTELIGENTE DE GRAU (REGULAR EXPRESSION)
    const is1st = /([·•*]|\s)\s*1(st|º|er)/i.test(bodyTxt)
    const is2nd = /([·•*]|\s)\s*2(nd|º|nd)/i.test(bodyTxt)
    
    dados.connection_degree = is1st ? '1' : is2nd ? '2' : '3'
    dados.temperature = dados.connection_degree === '1' ? 'quente' : 'frio'
  } catch(e) {}

  try {
    // 8. INFOS DE CONTATO
    extrairInfoContato(dados)
  } catch(e) {}

  try {
    // 9. ID
    const pathParts = window.location.pathname.split('/')
    const inIdx = pathParts.indexOf('in')
    dados.linkedin_id = (inIdx !== -1 && pathParts[inIdx + 1]) ? pathParts[inIdx + 1] : ''
  } catch(e) {}

  return dados
}

// ==========================================
// EXTRAI EMPRESA DA SEÇÃO EXPERIÊNCIA
// ==========================================
function extrairEmpresaDaExperiencia() {
  // Tenta pegar do card de experiência atual (posição mais recente)
  const expSelectors = [
    // Empresa no painel direito do top card
    '#experience ~ div .pvs-list__item--line-separated:first-child .t-14.t-normal',
    '.pv-top-card--experience-list li:first-child .pv-entity__secondary-title',
    // Empresa no summary do topo
    '.pv-text-details__right-panel .hoverable-link-text span',
    '.pv-text-details__right-panel .text-body-small span',
    // Experiência na seção principal
    '#experience + div .pvs-list__paged-list-item:first-child .t-14',
    '.experience-section li:first-child .pv-entity__secondary-title',
  ]

  for (const sel of expSelectors) {
    const el = document.querySelector(sel)
    const txt = el?.innerText?.trim()
    if (txt && txt.length > 1 && txt.length < 100 &&
        !txt.includes('•') && !txt.match(/^\d/) &&
        !txt.includes('ano') && !txt.includes('mês')) {
      return txt
    }
  }

  // Fallback: tenta extrair da headline se tiver padrão "Cargo · Empresa"
  const headlineEl = document.querySelector('.text-body-medium.break-words') ||
                     document.querySelector('.pv-text-details__left-panel .text-body-medium')
  const headline = headlineEl?.innerText?.trim() || ''
  if (headline.includes(' · ')) return headline.split(' · ').pop().split('|')[0].trim()
  if (headline.includes(' na ')) return headline.split(' na ').pop().split('|')[0].trim()
  if (headline.includes(' at ')) return headline.split(' at ').pop().split('|')[0].trim()

  return ''
}

// ==========================================
// EXTRAI BIO / SOBRE
// ==========================================
function extrairSobre() {
  const sobreSelectors = [
    '#about ~ div .pv-shared-text-with-see-more span[aria-hidden="true"]',
    '#about ~ .pvs-list__outer-container span[aria-hidden="true"]',
    '.pv-about-section .pv-about__summary-text',
    '[data-generated-suggestion-target] .display-flex span[aria-hidden="true"]'
  ]
  for (const sel of sobreSelectors) {
    const el = document.querySelector(sel)
    const txt = el?.innerText?.trim()
    if (txt && txt.length > 20) return txt.substring(0, 1500)
  }
  return ''
}

// ==========================================
// EXTRAI CARGO E EMPRESA ATUAISfunction extrairExperienciaAtual() {
  let root = document.querySelector('#experience')?.parentElement || 
             document.querySelector('.pv-profile-section--experience-section')?.parentElement;
  
  // Se não achar pelo ID/Classe, busca por texto "Experiência" ou "Experience"
  if (!root) {
    const headers = Array.from(document.querySelectorAll('h2, h3, span')).filter(el => {
      const txt = el.innerText?.trim().toLowerCase();
      return txt === 'experiência' || txt === 'experience' || txt === 'experiencias';
    });
    if (headers.length > 0) {
      root = headers[0].closest('section') || headers[0].parentElement?.parentElement;
    }
  }

  if (!root) return { role: '', company: '' }

  // Busca o primeiro item da lista de experiência
  const expNode = root.querySelector('li.pvs-list__paged-list-item, li.pvs-list__item, .experience-item, li');
  if (!expNode) return { role: '', company: '' }

  const textNodes = Array.from(expNode.querySelectorAll('.t-bold span[aria-hidden="true"], .t-bold, strong'))
    .map(el => el.innerText?.trim())
    .filter(t => t && t.length > 1 && !t.includes('ano') && !t.includes('mês') && !t.match(/^[0-9]/));

  let role = ''
  let company = ''

  if (textNodes.length >= 1) {
    const subList = expNode.querySelector('ul');
    if (subList) {
      company = textNodes[0]; 
      const subRoleEl = subList.querySelector('.t-bold span[aria-hidden="true"], .t-bold, strong');
      role = subRoleEl?.innerText?.trim() || '';
    } else {
      role = textNodes[0];
      const companyEl = expNode.querySelector('.t-normal span[aria-hidden="true"], .t-normal, span:not(.t-bold)');
      company = companyEl?.innerText?.split('·')[0].trim() || '';
    }
  }

  return { role, company }
}


// ==========================================
// EXTRAI INFORMAÇÕES DE CONTATO
// Funciona quando o modal de contato está aberto
// ==========================================
// ==========================================
// NORMALIZA TELEFONE COM DDD POR ESTADO BR
// ==========================================
function inferirDDD(location) {
  if (!location) return null
  const loc = location.toLowerCase()
  const mapa = [
    [['são paulo', 'sp,', ', sp', 'grande sp', 'campinas', 'ribeirão preto', 'sorocaba', 'santos', 'guarulhos', 'osasco', 'barueri', 'mogi'], '11'],
    [['rio de janeiro', 'rj,', ', rj', 'niterói', 'niteroi', 'volta redonda'], '21'],
    [['belo horizonte', 'minas gerais', 'mg,', ', mg', 'contagem', 'uberlândia', 'betim', 'juiz de fora'], '31'],
    [['curitiba', 'paraná', 'pr,', ', pr', 'pinhais', 'são josé dos pinhais'], '41'],
    [['londrina'], '43'],
    [['maringá'], '44'],
    [['porto alegre', 'rio grande do sul', 'rs,', ', rs', 'canoas', 'novo hamburgo'], '51'],
    [['brasília', 'distrito federal', 'df,', ', df'], '61'],
    [['goiânia', 'goiás', 'go,', ', go'], '62'],
    [['salvador', 'bahia', 'ba,', ', ba', 'lauro de freitas', 'camaçari'], '71'],
    [['recife', 'pernambuco', 'pe,', ', pe', 'olinda', 'caruaru'], '81'],
    [['fortaleza', 'ceará', 'ce,', ', ce'], '85'],
    [['manaus', 'amazonas', 'am,', ', am'], '92'],
    [['florianópolis', 'santa catarina', 'sc,', ', sc', 'joinville', 'blumenau'], '47'],
    [['belém', 'pará', 'pa,', ', pa'], '91'],
    [['vitória', 'espírito santo', 'es,', ', es', 'vila velha', 'cariacica'], '27'],
    [['natal', 'rio grande do norte', 'rn,', ', rn'], '84'],
    [['são luís', 'maranhão', 'ma,', ', ma'], '98'],
    [['maceió', 'alagoas', 'al,', ', al'], '82'],
    [['joão pessoa', 'paraíba', 'pb,', ', pb'], '83'],
    [['teresina', 'piauí', 'pi,', ', pi'], '86'],
    [['campo grande', 'mato grosso do sul', 'ms,', ', ms'], '67'],
    [['cuiabá', 'mato grosso', 'mt,', ', mt'], '65'],
    [['porto velho', 'rondônia', 'ro,', ', ro'], '69'],
    [['boa vista', 'roraima', 'rr,', ', rr'], '95'],
    [['macapá', 'amapá', 'ap,', ', ap'], '96'],
    [['palmas', 'tocantins', 'to,', ', to'], '63'],
    [['aracaju', 'sergipe', 'se,', ', se'], '79'],
  ]
  for (const [padroes, ddd] of mapa) {
    if (padroes.some(p => loc.includes(p))) return ddd
  }
  return null
}

function normalizarTelefone(phone, location) {
  if (!phone) return null
  // Remove tudo que não é número
  const nums = phone.replace(/\D/g, '')
  if (!nums || nums.length < 7) return null

  // Já completo com DDI 55
  if (nums.startsWith('55') && nums.length >= 12) return '+' + nums

  // DDD + número (10-11 dígitos)
  if (nums.length === 10 || nums.length === 11) return '+55' + nums

  // Só o número (8-9 dígitos) → infere DDD pelo estado
  if (nums.length === 8 || nums.length === 9) {
    const ddd = inferirDDD(location) || '11'
    return '+55' + ddd + nums
  }

  return '+55' + nums
}

function extrairInfoContato(dados) {
  // LOCALIZAÇÃO da página para inferir DDD
  const locPage = document.querySelector('.pv-top-card--list li:last-child, .pv-text-details__left-panel .t-normal')?.innerText?.trim() || dados.location || ''

  // 1. MODO INFALÍVEL: Busca por Links (a tags) em todo o documento
  const links = document.querySelectorAll('a');
  links.forEach(a => {
    const href = a.href || '';
    if (href.startsWith('mailto:') && !dados.email) dados.email = href.replace('mailto:', '').trim();
    if (href.startsWith('tel:') && !dados.phone) dados.phone = normalizarTelefone(href.replace('tel:', '').trim(), locPage);
    // Website (evita links internos do linkedin)
    if (href.startsWith('http') && !href.includes('linkedin.com') && !dados.website) {
      // Checa se o elemento pai ou o próprio link parece ser um site de contato
      if (a.closest('.pv-contact-info, .artdeco-modal__content') || a.getAttribute('data-field') === 'website_url') {
        dados.website = href;
      }
    }
  });

  // 2. MODO ASPIRADOR: Varre todo o texto do modal de contatos
  const modal = document.querySelector('.artdeco-modal__content, .pv-contact-info, #artdeco-modal-outlet');
  if (modal) {
    const rawText = modal.innerText || '';
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const lowerLines = lines.map(l => l.toLowerCase());

    // NOME (Caso a extração principal falhe e o modal esteja aberto)
    const profileOfIdx = lowerLines.findIndex(l => l.includes('perfil de') || l.includes("'s profile"));
    if (profileOfIdx !== -1 && !dados.name) {
      dados.name = lines[profileOfIdx].replace(/perfil de|'s profile/gi, '').trim();
    }

    // 3. MODO CIRÚRGICO: Busca exata pelas etiquetas (labels) do modal
    for (let i = 0; i < lowerLines.length; i++) {
      const linha = lowerLines[i];
      const proximaLinha = lines[i+1] || '';

      // LinkedIn Profile URL (no modal)
      if (linha.includes('perfil de') || linha.includes("'s profile")) {
        // Pega a URL que deve estar logo abaixo ou na mesma linha
        const urlMatch = rawText.match(/linkedin\.com\/in\/[a-zA-Z0-9-.]+/);
        if (urlMatch && !dados.linkedin_url) dados.linkedin_url = 'https://' + urlMatch[0];
      }
      
      // Telefone
      if (linha === 'telefone' || linha === 'phone' || linha === 'celular') {
        if (proximaLinha && !dados.phone) {
          dados.phone = normalizarTelefone(proximaLinha, locPage);
        }
      }

      // E-mail
      if (linha === 'e-mail' || linha === 'email' || linha === 'correio eletrônico') {
        if (proximaLinha && !dados.email) {
          dados.email = proximaLinha.trim().toLowerCase();
        }
      }

      // Aniversário
      if (linha === 'aniversário' || linha === 'birthday' || linha === 'data de nascimento') {
        if (proximaLinha && !dados.birthday) {
          dados.birthday = proximaLinha.trim();
        }
      }

      // Conexão desde
      if (linha.includes('conexão desde') || linha.includes('connected since')) {
        if (proximaLinha && !dados.connected_since) {
          dados.connected_since = proximaLinha.trim();
        }
      }
    }
  }

  return dados
}

// ==========================================
// ABRE MODAL DE CONTATO E EXTRAI DADOS
// ==========================================
async function abrirEExtrairContato() {
  exibirBannerAcao('⏳ Analisando perfil (Modo de Segurança Ativo)...', '#00c896')
  
  // 1. SIMULA COMPORTAMENTO HUMANO (Scroll até o botão)
  const botoesContato = Array.from(document.querySelectorAll('a, button, span')).filter(el => {
    const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
    return txt.includes('informações de contato') || txt.includes('contact info') || txt.includes('dados de contato');
  });

  if (botoesContato.length > 0) {
    botoesContato[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    await esperar(1500);
    botoesContato[0].click();
    // Espera modal abrir (mais tempo para segurança)
    await esperar(5000);
  } else {
    // Se não achou botão, tenta scroll geral
    window.scrollBy({ top: 300, behavior: 'smooth' });
    await esperar(2000);
  }

  // Tenta extrair. Se falhar, tenta uma busca bruta no HTML
  let dados = await extrairPerfilIndividualCompleto();
  
  if (!dados.phone || !dados.email) {
    console.log('🕵️‍♂️ Brute force extraction initiated...');
    const html = document.body.innerHTML;
    const phoneMatch = html.match(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/);
    if (phoneMatch && !dados.phone) {
      dados.phone = normalizarTelefone(phoneMatch[0], dados.location);
    }
    const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !dados.email) {
      dados.email = emailMatch[0].toLowerCase();
    }
  }

  // Fecha o modal
  const fecharBtn = document.querySelector('[aria-label="Fechar"], [aria-label="Close"], .artdeco-modal__dismiss')
  if (fecharBtn) {
    await esperar(1000);
    fecharBtn.click();
  }

  return dados;
}

// ==========================================
// ENVIA MENSAGEM NO INBOX DO LINKEDIN
// ==========================================
async function enviarMensagemLinkedIn(texto) {
  try {
    const botoesMsg = Array.from(document.querySelectorAll('button, a')).filter(el => {
      const txt = el.innerText?.trim().toLowerCase()
      return txt === 'mensagem' || txt === 'message' || txt === 'enviar mensagem'
    })

    if (botoesMsg.length === 0) {
      return { sucesso: false, erro: 'Botão "Mensagem" não encontrado. Você precisa estar no perfil de uma conexão de 1º grau.' }
    }

    botoesMsg[0].click()
    await esperar(1800)

    const camposTexto = [
      '.msg-form__contenteditable',
      '.msg-convo-wrapper [contenteditable="true"]',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '.msg-form__msg-content-container [contenteditable]',
      '[data-placeholder*="mensagem"], [data-placeholder*="message"]'
    ]

    let campo = null
    // Busca RADICAL: pega tudo que for editável e visível
    const possiveis = Array.from(document.querySelectorAll('[contenteditable="true"]')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    // Se achou vários, tenta filtrar pelos que estão no container de mensagens
    campo = possiveis.find(el => el.closest('.msg-form__contenteditable, .msg-convo-wrapper, .messaging-thread')) || possiveis[0];

    if (!campo) {
      // Fallback final: tenta os seletores clássicos
      for (const sel of camposTexto) {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().width > 0) { campo = el; break; }
      }
    }

    if (!campo) return { sucesso: false, erro: 'Não consegui encontrar a caixa de texto. Tente abrir o chat manualmente primeiro.' }

    campo.focus()
    await esperar(500)
    campo.click()
    await esperar(300)
    
    // Insere o texto e força o LinkedIn a reconhecer a mudança
    campo.innerHTML = ''
    document.execCommand('insertText', false, texto)
    
    // Dispara múltiplos eventos para "despertar" os listeners do React/LinkedIn
    const eventos = ['input', 'change', 'blur', 'keyup']
    eventos.forEach(ev => {
      campo.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }))
    })

    if (!campo.innerText?.trim()) {
      campo.innerText = texto
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    }

    // --- NOVIDADE: Envio Automático (v5 - Força Bruta e Enter) ---
    await esperar(1500) // Aumentado para garantir carregamento
    
    const buscarBotao = () => {
      return document.querySelector('.msg-form__send-button') || 
             document.querySelector('button[type="submit"].msg-form__send-button') ||
             document.querySelector('button[aria-label*="Enviar"], button[aria-label*="Send"]') ||
             Array.from(document.querySelectorAll('button')).find(el => {
               const t = el.innerText?.trim().toLowerCase()
               const al = el.getAttribute('aria-label')?.toLowerCase() || ''
               return t === 'enviar' || t === 'send' || al.includes('enviar') || al.includes('send')
             })
    }

    // 1. TENTA VIA TECLA ENTER (Fallback rápido)
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    campo.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

    let btnEnviar = buscarBotao()
    
    if (btnEnviar) {
      btnEnviar.disabled = false
      btnEnviar.removeAttribute('disabled')
      
      // Simula um clique humano completo
      const evs = ['mousedown', 'mouseup', 'click']
      evs.forEach(tipo => {
        btnEnviar.dispatchEvent(new MouseEvent(tipo, { view: window, bubbles: true, cancelable: true }))
      })
      
      console.log('✅ Tentativa de envio v5 concluída!');
      return { sucesso: true, mensagem: '🚀 Mensagem disparada!' }
    }

    return { sucesso: true, mensagem: 'Mensagem inserida! (Botão enviar não encontrado)' }
  } catch (err) {
    return { sucesso: false, erro: err.message }
  }
}

// ==========================================
// EXTRAI LISTA DE BUSCA
// ==========================================
function extrairListaDeBusca() {
  const leads = []
  const vistos = new Set()
  
  // ALVO: Varre a página em busca de qualquer item que pareça um resultado de pessoa
  // Procuramos links que apontam para perfis "/in/"
  const links = Array.from(document.querySelectorAll('a[href*="/in/"]')).filter(a => {
    const href = a.href || ''
    return href.includes('/in/') && !href.includes('/in/ACoAA') && !href.includes('miniProfile')
  })

  links.forEach(link => {
    try {
      const href = new URL(link.href).pathname
      const match = href.match(/\/in\/([a-zA-Z0-9_-]+)/)
      if (!match) return
      const linkedin_id = match[1]
      
      if (vistos.has(linkedin_id)) return
      vistos.add(linkedin_id)

      // Sobe o DOM para achar o container do card (geralmente uma li ou div com borda)
      let card = link.closest('li, .reusable-search__result-container, .entity-result') || link.parentElement?.parentElement?.parentElement
      if (!card) return

      const lead = { 
        linkedin_id, 
        linkedin_url: `https://www.linkedin.com/in/${linkedin_id}`, 
        source: 'chrome_extension' 
      }
      
      // EXTRAÇÃO AGRESSIVA: Pega o primeiro texto em negrito como Nome
      const nomeEl = card.querySelector('.entity-result__title-text, .t-bold, h3, span[aria-hidden="true"]')
      let nomeFinal = nomeEl?.innerText?.split('\n')[0].replace(/·\s*[123][ºostndrd]+/gi, '').trim()
      
      // Se o link já tem o nome (comum no LinkedIn), usa ele
      if (!nomeFinal || nomeFinal.length < 2) {
        nomeFinal = link.innerText?.trim()?.split('\n')[0]
      }
      
      lead.name = nomeFinal

      // Cargo: Pega o primeiro texto secundário
      const cargoEl = card.querySelector('.entity-result__primary-subtitle, .t-14.t-black.t-normal')
      if (cargoEl) lead.headline = cargoEl.innerText.trim()

      // Localização
      const locEl = card.querySelector('.entity-result__secondary-subtitle, .t-12.t-black--light.t-normal')
      if (locEl) lead.location = locEl.innerText.trim()

      // Foto
      const imgEl = card.querySelector('img')
      if (imgEl?.src && !imgEl.src.includes('ghost')) lead.profile_picture = imgEl.src

      // Grau
      const texto = card.innerText || ''
      if (texto.includes('1º') || texto.includes('1st')) lead.connection_degree = '1'
      else if (texto.includes('2º') || texto.includes('2nd')) lead.connection_degree = '2'
      else lead.connection_degree = '3'

      if (lead.name && lead.name.length > 2 && !lead.name.toLowerCase().includes('linkedin')) {
        leads.push(lead)
      }
    } catch(e) { /* silent fail for individual items */ }
  })

  return leads
}

function detectarTipoPagina() {
  const url = window.location.href
  if (url.includes('/search/results/')) return 'busca'
  if (url.includes('/in/')) return 'perfil'
  return 'outro'
}

function esperar(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

// ==========================================
// AÇÃO AUTOMÁTICA VIA URL (disparada pelo web app)
// Web app abre: linkedin.com/in/perfil?lp_action=connect&lp_msg=...
// ==========================================
async function verificarAcaoPendenteURL() {
  const params = new URLSearchParams(window.location.search)
  const acao = params.get('lp_action')
  const msg = params.get('lp_msg')
  const leadId = params.get('lp_lead_id')
  if (!acao) return

  await esperar(2500) // aguarda a página carregar completamente

  // ================================================
  // CAPTURA AUTOMÁTICA DE CONTATOS (telefone/email)
  // Acionado pelo botão 📞 no dashboard
  // ================================================
  if (acao === 'capture_contacts') {
    exibirBannerAcao('⏳ Capturando dados do perfil e contatos...', '#1d8fe8')
    const dados = {}

    // Tentar SEMPRE abrir o modal "Dados de contato" se ele não estiver visível
    const isModalAberto = () => document.querySelector('.artdeco-modal__content, .pv-contact-info') !== null
    
    if (!isModalAberto()) {
      const btnContato = document.querySelector('#top-card-text-details-contact-info, [href$="/overlay/contact-info/"]') ||
        Array.from(document.querySelectorAll('a, button, span')).find(el => {
          const t = el.innerText?.trim().toLowerCase()
          return t && (t.includes('dados de contato') || t.includes('informações de contato') || t.includes('contact info'))
        })

      if (btnContato) {
        btnContato.click()
        await esperar(2000) // Aguarda animacao do modal
      }
    } else {
      await esperar(1500) // Se já estava aberto via URL, espera carregar
    }

    extrairInfoContato(dados) // Extrai tudo

    // Tenta fechar o modal
    const fechar = document.querySelector('.artdeco-modal__dismiss, [aria-label*="Fechar"], [aria-label*="Close"]')
    if (fechar) {
      fechar.click()
    } else {
      window.history.back() // Fallback
    }
    await esperar(1000)

    // Só atualiza se tiver conseguido extrair ALGO útil (contatos ou cargo ou localização)
    const temContatos = dados.phone || dados.email || dados.birthday || dados.connected_since
    // Não vamos mais dar early return ainda, pois pode não ter telefone, mas a gente ainda quer atualizar Cargo e Empresa!

    // ============================================
    // DADOS DO PERFIL (Localização, Cargo Real)
    // ============================================
    // Rolar a página para baixo para forçar o carregamento do #experience (lazy-load)
    window.scrollTo(0, document.body.scrollHeight / 3)
    await esperar(800)
    window.scrollTo(0, document.body.scrollHeight / 2)
    await esperar(800)

    const payload = {}
    if (dados.phone) payload.phone = dados.phone
    if (dados.email) payload.email = dados.email
    if (dados.birthday) payload.birthday = dados.birthday
    if (dados.connected_since) payload.connected_since = dados.connected_since
    if (dados.website) payload.website = dados.website
    
    // Captura localização real
    const locEl = document.querySelector('.pv-text-details__left-panel span.text-body-small') || 
                  document.querySelector('.pv-top-card--list li:last-child')
    const locPage = locEl?.innerText?.trim()
    if (locPage && locPage.length > 3 && locPage.length < 100) {
      payload.location = locPage
    }

    // Captura Cargo e Empresa Reais da aba Experiência
    const { role, company } = extrairExperienciaAtual()
    if (role && role.length > 2) payload.current_role = role
    if (company && company.length > 2) payload.current_company = company

    // Envia via background (CSP do LinkedIn bloqueia fetch direto de content scripts)
    chrome.runtime.sendMessage(
      { action: 'apiRequest', method: 'PUT', path: `/api/leads/${leadId}`, body: payload },
      (response) => {
        if (response?.sucesso) {
          const itens = Object.entries(payload).map(([k, v]) => `${k}: ${v}`).join(' | ')
          exibirBannerAcao(`✅ Contatos salvos!\n${itens}`, '#00c896')
        } else {
          exibirBannerAcao('❌ Erro ao salvar: ' + (response?.erro || 'falha na requisição'), '#ff3b5c')
        }
      }
    )
    return
  }

  if (acao === 'connect' || acao === 'conectar') {
    // Clica no botão Conectar
    const btnConectar = Array.from(document.querySelectorAll('button')).find(b => {
      const t = b.innerText?.trim().toLowerCase()
      return t === 'conectar' || t === 'connect' || t === 'connect with'
    })
    if (btnConectar) {
      btnConectar.click()
      await esperar(1000)
      // Clica em "Adicionar nota" se disponível
      const btnNota = Array.from(document.querySelectorAll('button, span')).find(b => {
        const t = b.innerText?.trim().toLowerCase()
        return t.includes('adicionar nota') || t.includes('add a note')
      })
      if (btnNota && msg) {
        btnNota.click()
        await esperar(1000)
        const textarea = document.querySelector('#custom-message, textarea[name="message"], .send-invite__custom-message')
        if (textarea) {
          textarea.value = decodeURIComponent(msg)
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
          textarea.dispatchEvent(new Event('change', { bubbles: true }))
          
          await esperar(800)
          // Clica no botão Enviar Convite
          const btnEnviarConvite = Array.from(document.querySelectorAll('button')).find(b => {
            const t = b.innerText?.trim().toLowerCase()
            return t.includes('enviar') || t.includes('send') || t.includes('enviar agora')
          })
          if (btnEnviarConvite) btnEnviarConvite.click()
        }
      }
      // Notifica o usuário via banner
      exibirBannerAcao('🚀 Convite de conexão enviado automaticamente!', '#1d8fe8')
    } else {
      exibirBannerAcao('⚠️ Botão "Conectar" não encontrado. Talvez já sejam conectados.', '#ff6b35')
    }
  }

  if (acao === 'message' || acao === 'mensagem') {
    if (msg) {
      const resultado = await enviarMensagemLinkedIn(decodeURIComponent(msg))
      if (resultado.sucesso) {
        exibirBannerAcao('✅ Mensagem inserida no inbox! Revise e clique Enviar.', '#00c896')
      } else {
        exibirBannerAcao(`⚠️ ${resultado.erro}`, '#ff6b35')
      }
    }
  }
}

function exibirBannerAcao(texto, cor) {
  const banner = document.createElement('div')
  banner.style.cssText = `position:fixed;top:16px;right:16px;z-index:99999;padding:12px 20px;background:${cor};color:#fff;font-family:sans-serif;font-size:13px;font-weight:600;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:360px;`
  banner.innerText = '🔗 LinkedIn Prospector\n' + texto
  document.body.appendChild(banner)
  setTimeout(() => banner.remove(), 6000)
}

// Executa verificação de ação pendente se estiver em perfil do LinkedIn
if (window.location.href.includes('/in/') && window.location.search.includes('lp_action')) {
  verificarAcaoPendenteURL()
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectarPagina') {
    const url = window.location.href;
    const isPerfil = url.includes('/in/') || !!document.querySelector('.pv-top-card') || !!document.querySelector('.pv-profile-section');
    const isBusca = url.includes('/search/results/people/') || !!document.querySelector('.search-results-container');
    
    sendResponse({ 
      tipo: isPerfil ? 'perfil' : isBusca ? 'busca' : 'outro',
      url: url
    });
    return true
  }
  if (request.action === 'extrairPerfil') {
    abrirEExtrairContato()
      .then(dados => sendResponse({ sucesso: true, dados }))
      .catch(e => {
        console.error('🔥 Erro Crítico no content script:', e);
        exibirBannerAcao('❌ Erro na extração. Consulte o console (F12).', '#ff3b5c');
        sendResponse({ sucesso: false, erro: e.toString() });
      })
    return true
  }
  if (request.action === 'extrairBusca') {
    const leads = extrairListaDeBusca()
    sendResponse({ sucesso: true, leads, total: leads.length })
    return true
  }
  if (request.action === 'extrairPerfil') {
    extrairPerfilIndividualCompleto().then(dados => sendResponse({ dados }))
    return true
  }
  if (request.action === 'extrairCompleto') {
    abrirEExtrairContato().then(dados => sendResponse({ dados }))
    return true
  }
  if (request.action === 'enviarMensagemLinkedIn') {
    enviarMensagemLinkedIn(request.texto)
      .then(resultado => sendResponse(resultado))
      .catch(e => sendResponse({ sucesso: false, erro: e.toString() }))
    return true
  }
  return true
})
