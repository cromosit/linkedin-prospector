// content.js — LinkedIn Prospector v7
// Extração completa: empresa da Experiência, localização correta,
// informações de contato, sobre, e dados para IA preencher campos

// ==========================================
// EXTRAI PERFIL INDIVIDUAL COMPLETO
// ==========================================
async function extrairPerfilIndividualCompleto() {
  const dados = {}

  // NOME — filtra badges e graus
  const nomeSelectors = ['h1.text-heading-xlarge','h1.inline.t-24','.pv-text-details__left-panel h1','.ph5 h1','main h1']
  for (const sel of nomeSelectors) {
    const el = document.querySelector(sel)
    const txt = el?.innerText?.trim()
    if (txt && txt.length > 1 && txt.length < 80 && !txt.includes('•') && !txt.includes('º') && !txt.match(/^\d/)) {
      dados.name = txt; break
    }
  }

  // HEADLINE / CARGO
  const headlineSelectors = ['.text-body-medium.break-words','.pv-text-details__left-panel .text-body-medium','.ph5 .text-body-medium']
  for (const sel of headlineSelectors) {
    const el = document.querySelector(sel)
    const txt = el?.innerText?.trim()
    if (txt && txt.length > 2 && !txt.includes('•') && !txt.includes('º')) { dados.headline = txt; break }
  }

  // LOCALIZAÇÃO — pega apenas localização real, filtra nomes de pessoas
  const locationSelectors = [
    '.pv-text-details__left-panel .pb2 span.text-body-small',
    '.ph5 .mt2 span.text-body-small',
    '.pv-top-card--list .pv-top-card--list-bullet span'
  ]
  for (const sel of locationSelectors) {
    const els = document.querySelectorAll(sel)
    for (const el of els) {
      const txt = el?.innerText?.trim()
      // Localização real tem vírgula com estado/país, não nomes de pessoas
      if (txt && txt.length > 3 && txt.length < 60 &&
          !txt.includes('conexões') && !txt.includes('seguidores') &&
          (txt.includes(',') || txt.includes('Brasil') || txt.includes('Brazil') ||
           txt.match(/[A-Z]{2}$/) || txt.includes('São Paulo') || txt.includes('Curitiba') ||
           txt.includes('Rio') || txt.includes('Minas'))) {
        dados.location = txt; break
      }
    }
    if (dados.location) break
  }

  // EMPRESA — da seção de Experiência (mais confiável que headline)
  dados.company = extrairEmpresaDaExperiencia()

  // FOTO
  const fotoSelectors = ['.pv-top-card-profile-picture__image--show','img.pv-top-card-profile-picture__image','img[class*="profile-picture"]']
  for (const sel of fotoSelectors) {
    const el = document.querySelector(sel)
    if (el?.src && !el.src.includes('ghost') && el.src.startsWith('https')) { dados.profile_picture = el.src; break }
  }

  // GRAU DE CONEXÃO — normaliza bullet Unicode antes de verificar
  // LinkedIn usa: • (U+2022), · (U+00B7), ⋅ (U+22C5) etc.
  const bodyTxt = (document.body.innerText || '').replace(/[·⋅∙•]/g, '•')
  if (/•\s*1[\u00baoa]/.test(bodyTxt) || bodyTxt.includes(' 1st ') || bodyTxt.includes('· 1º')) dados.connection_degree = '1'
  else if (/•\s*2[\u00baoa]/.test(bodyTxt) || bodyTxt.includes(' 2nd ') || bodyTxt.includes('· 2º')) dados.connection_degree = '2'
  else dados.connection_degree = '3'

  // CONEXÕES EM COMUM
  const mutualMatch = bodyTxt.match(/(\d+)\s+conex[õo]es? em comum/i)
  if (mutualMatch) dados.mutual_connections = mutualMatch[0]

  // SEGUIDORES
  const segMatch = bodyTxt.match(/([\d.,]+)\s+seguidores?/i)
  if (segMatch) dados.followers = segMatch[0]

  // SOBRE (bio completa)
  dados.about = extrairSobre()

  // INFORMAÇÕES DE CONTATO (visíveis se o painel estiver aberto)
  extrairInfoContato(dados)

  // URL e ID
  dados.linkedin_url = window.location.href.split('?')[0]
  const urlMatch = window.location.pathname.match(/\/in\/([^/]+)/)
  dados.linkedin_id = urlMatch ? urlMatch[1] : ''
  dados.temperature = dados.connection_degree === '1' ? 'quente' : dados.connection_degree === '2' ? 'morno' : 'frio'
  dados.source = 'chrome_extension'

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
// EXTRAI CARGO E EMPRESA ATUAIS (REAL)
// ==========================================
function extrairExperienciaAtual() {
  const root = document.querySelector('#experience')?.parentElement || document.querySelector('.pv-profile-section--experience-section')?.parentElement
  if (!root) return { role: '', company: '' }

  const expNode = root.querySelector('ul.pvs-list > li')
  if (!expNode) return { role: '', company: '' }

  // O LinkedIn tem dois layouts para experiência: 
  // 1. Cargo único na empresa: primeiro t-bold = Cargo, primeiro t-normal = Empresa
  // 2. Múltiplos cargos na mesma empresa: primeiro t-bold = Empresa, cargos ficam aninhados em ul > li
  
  const textNodes = Array.from(expNode.querySelectorAll('.t-bold span[aria-hidden="true"], .t-normal span[aria-hidden="true"]'))
    .map(el => el.innerText?.trim())
    .filter(t => t && !t.match(/^[0-9]+ a anos|^[0-9]+ anos?|^[0-9]+ meses?/)) // ignora tempo de empresa

  let role = ''
  let company = ''

  if (textNodes.length >= 2) {
    const isMultiRole = expNode.querySelector('ul.pvs-list > li') !== null
    if (isMultiRole) {
      company = textNodes[0] || '' // 1o textNode
      // o cargo estará no primeiro .t-bold da sublist
      const subRoleEl = expNode.querySelector('ul.pvs-list > li .t-bold span[aria-hidden="true"]')
      role = subRoleEl?.innerText?.trim() || ''
    } else {
      role = textNodes[0] || ''
      company = (textNodes[1] || '').split('·')[0].trim() // Remove "... · Tempo Mínimo"
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

  // Email via href
  const emailEl = document.querySelector('a[href^="mailto:"]')
  if (emailEl) dados.email = emailEl.href.replace('mailto:', '').trim()

  // Telefone via tel: link
  const phoneEl = document.querySelector('a[href^="tel:"]')
  if (phoneEl) dados.phone = normalizarTelefone(phoneEl.href.replace('tel:', '').trim(), locPage || dados.location)

  // Website
  const websiteEl = document.querySelector('a[data-field="website_url"]') ||
                    document.querySelector('section.pv-contact-info a[href*="http"]:not([href*="linkedin"])')
  if (websiteEl) dados.website = websiteEl.href

  // Modal de contato: busca por h3 (header) + próximo elemento (valor)
  const headers = document.querySelectorAll(
    '.artdeco-modal__content h3, .pv-contact-info__header, .pv-contact-info__contact-type h3'
  )
  headers.forEach(h3 => {
    const headerTxt = h3.innerText?.trim().toLowerCase() || ''
    // Valor pode estar no próximo sibling ou dentro do parentElement
    const valorEl = h3.nextElementSibling ||
                    h3.parentElement?.querySelector('p, a, span.t-14, span.t-black')
    let valor = valorEl?.innerText?.trim() || valorEl?.href || ''
    valor = valor.replace(/\(.*?\)/g, '').trim() // remove "(Trabalho)", "(Pessoal)", etc.

    if (!dados.phone && valor && (headerTxt.includes('telefone') || headerTxt.includes('phone') || headerTxt.includes('celular') || headerTxt.includes('mobile'))) {
      // Normaliza aplicando DDD pelo estado se necessário
      const foneNorm = normalizarTelefone(valor, locPage || dados.location)
      if (foneNorm) dados.phone = foneNorm
    }
    if (!dados.email && valor && (headerTxt.includes('email') || headerTxt.includes('e-mail'))) {
      dados.email = valor.replace('mailto:', '').trim()
    }
    if (!dados.website && valor && (headerTxt.includes('website') || headerTxt.includes('site') || headerTxt.includes('blog'))) {
      dados.website = valor
    }
    if (valor && (headerTxt.includes('aniversário') || headerTxt.includes('birthday') || headerTxt.includes('nascimento'))) {
      dados.birthday = valor
    }
    if (valor && (headerTxt.includes('conectado') || headerTxt.includes('connected') || headerTxt.includes('membro desde'))) {
      dados.connected_since = valor
    }
  })

  // Fallback: contactItems estilo antigo do LinkedIn
  const contactItems = document.querySelectorAll('.pv-contact-info__contact-type, .ci-vanity-url, section.pv-contact-info section')
  contactItems.forEach(item => {
    const header = item.querySelector('h3')?.innerText?.toLowerCase() || ''
    const valueEl = item.querySelector('a, span.t-14, span.t-black')
    const value = valueEl?.innerText?.trim() || valueEl?.href || ''

    if ((header.includes('email') || header.includes('e-mail')) && !dados.email && value) {
      dados.email = value.replace('mailto:', '')
    }
    if ((header.includes('telefone') || header.includes('phone') || header.includes('celular') || header.includes('mobile')) && !dados.phone && value) {
      const foneNorm = normalizarTelefone(value.replace(/\(.*?\)/g, '').trim(), locPage || dados.location)
      if (foneNorm) dados.phone = foneNorm
    }
    if ((header.includes('website') || header.includes('site') || header.includes('blog')) && !dados.website && value) {
      dados.website = value
    }
    if ((header.includes('aniversário') || header.includes('birthday') || header.includes('nascimento')) && value) {
      dados.birthday = value
    }
    if ((header.includes('conectado') || header.includes('connected') || header.includes('membro desde')) && value) {
      dados.connected_since = value
    }
    if (header.includes('twitter') || header.includes('x.com')) {
      dados.twitter = value
    }
  })
}

// ==========================================
// ABRE MODAL DE CONTATO E EXTRAI DADOS
// ==========================================
async function abrirEExtrairContato() {
  // Textos possíveis do botão de contato (PT e EN)
  const textosBotao = [
    'informações de contato', 'contact info', 'ver informações de contato',
    'dados de contato', 'ver dados de contato', 'informacoes de contato'
  ]
  const botoesContato = Array.from(document.querySelectorAll('a, button, span')).filter(el => {
    const txt = el.innerText?.trim().toLowerCase()
    return textosBotao.some(t => txt === t || txt?.includes(t))
  })

  if (botoesContato.length > 0) {
    botoesContato[0].click()
    await esperar(1800) // aguarda modal abrir
  }

  const dados = await extrairPerfilIndividualCompleto()

  // Fecha o modal se foi aberto
  const fecharBtn = document.querySelector('[aria-label="Fechar"], [aria-label="Close"], .artdeco-modal__dismiss')
  if (fecharBtn) fecharBtn.click()

  return dados
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
      '[data-placeholder="Escreva uma mensagem..."]',
      '[data-placeholder="Write a message..."]',
      '.msg-form__msg-content-container [contenteditable]',
      '[role="textbox"]'
    ]

    let campo = null
    for (const sel of camposTexto) { campo = document.querySelector(sel); if (campo) break }
    if (!campo) { await esperar(1500); for (const sel of camposTexto) { campo = document.querySelector(sel); if (campo) break } }
    if (!campo) return { sucesso: false, erro: 'Campo de mensagem não encontrado. Tente novamente.' }

    campo.focus()
    await esperar(300)

    // Insere o texto
    campo.innerHTML = ''
    document.execCommand('insertText', false, texto)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
    await esperar(300)

    if (!campo.innerText?.trim()) {
      campo.innerText = texto
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    }

    return { sucesso: true, mensagem: 'Mensagem inserida no chat! Revise e clique Enviar.' }
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
  const blacklist = ['messaging','notifications','jobs','feed','mynetwork','search','company','school','groups','events','learning','premium','sales','recruiter','talent']
  const todosLinks = document.querySelectorAll('a[href*="/in/"]')

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
      vistos.add(linkedin_id)

      const lead = { linkedin_id, linkedin_url: `https://www.linkedin.com/in/${linkedin_id}`, source: 'chrome_extension' }
      // Sobe até encontrar o card raiz do resultado de busca
      let card = link
      for (let i = 0; i < 12; i++) {
        card = card.parentElement
        if (!card || card.tagName === 'BODY') break
        // Para no primeiro container grande que contenha o nome E mais dados
        if (card.querySelectorAll('a[href*="/in/"]').length === 1 &&
            (card.className?.includes('result') || card.className?.includes('entity') ||
             card.className?.includes('reusable') || card.className?.includes('search') ||
             card.tagName === 'LI')) break
      }
      if (!card || card.tagName === 'BODY') card = link.parentElement?.parentElement?.parentElement

      const texto = card?.innerText || document.body.innerText || ''

      // NOME
      if (!lead.name) {
        const nomeSpan = link.querySelector('span[aria-hidden="true"]') || link.querySelector('span')
        const nomeTexto = nomeSpan?.innerText?.trim() || link.innerText?.trim()
        if (nomeTexto && nomeTexto.length > 1 && nomeTexto.length < 80 &&
            !nomeTexto.includes('•') && !nomeTexto.includes('·') && !nomeTexto.includes('º')) {
          lead.name = nomeTexto
        }
      }

      // FOTO
      if (!lead.profile_picture && card) {
        const img = card.querySelector('img')
        if (img?.src && img.src.startsWith('https') && !img.src.includes('ghost') &&
            (img.src.includes('media') || img.src.includes('profile'))) {
          lead.profile_picture = img.src
        }
      }

      // HEADLINE — seletores modernos do LinkedIn 2024
      if (!lead.headline && card) {
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

      // GRAU DE CONEXÃO
      if (!lead.connection_degree) {
        const t = texto.replace(/[\u00b7\u22c5\u2219]/g, '\u2022')
        if (/\u2022\s*1[\u00bao\u00b0]/.test(t) || t.includes('1st')) lead.connection_degree = '1'
        else if (/\u2022\s*2[\u00bao\u00b0]/.test(t) || t.includes('2nd')) lead.connection_degree = '2'
        else if (/\u2022\s*3[\u00bao\u00b0]/.test(t) || t.includes('3rd') || t.includes('3\u00ba e +')) lead.connection_degree = '3'
      }

      // CONEXÕES EM COMUM
      if (!lead.mutual_connections) {
        const m = texto.match(/(\d+)\s+conex[\u00f5o]es? em comum/i)
        if (m) lead.mutual_connections = m[0]
      }

      // LOCALIZAÇÃO — apenas seletor CSS específico, sem fallback por texto livre
      // (texto livre capturava cidades erradas de outros cards ou conexões em comum)
      if (!lead.location && card) {
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

      if (!lead.name || lead.name.length < 2) return
      if (lead.name.toLowerCase().includes('linkedin')) return
      if (lead.name.includes('•') || lead.name.includes('º')) return

      if (lead.headline && !lead.company) {
        if (lead.headline.includes(' · ')) lead.company = lead.headline.split(' · ').pop().trim()
        else if (lead.headline.includes(' na ')) lead.company = lead.headline.split(' na ').pop().split('|')[0].trim()
        else if (lead.headline.includes(' at ')) lead.company = lead.headline.split(' at ').pop().split('|')[0].trim()
      }

      lead.connection_degree = lead.connection_degree || '3'
      lead.temperature = lead.connection_degree === '1' ? 'quente' : lead.connection_degree === '2' ? 'morno' : 'frio'
      leads.push(lead)
    } catch(e) {}
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
    exibirBannerAcao('⏳ Capturando dados de contato...', '#1d8fe8')
    const dados = {}
    extrairInfoContato(dados)

    // Abre "Dados de contato" se ainda não tiver telefone/email
    if (!dados.phone && !dados.email) {
      const textosBotao = ['dados de contato', 'informações de contato', 'contact info']
      const btnContato = Array.from(document.querySelectorAll('a, button, span')).find(el => {
        const t = el.innerText?.trim().toLowerCase()
        return textosBotao.some(txt => t === txt || t?.includes(txt))
      })
      if (btnContato) {
        btnContato.click()
        await esperar(1800)
        extrairInfoContato(dados)
        // Fecha modal
        const fechar = document.querySelector('[aria-label="Fechar"], [aria-label="Close"], .artdeco-modal__dismiss')
        if (fechar) fechar.click()
      }
    }

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
        await esperar(800)
        const textarea = document.querySelector('#custom-message, textarea[name="message"], .send-invite__custom-message')
        if (textarea) {
          textarea.value = decodeURIComponent(msg)
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
          textarea.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }
      // Notifica o usuário via banner
      exibirBannerAcao('✅ Convite de conexão pronto! Revise a nota e clique Enviar.', '#00c896')
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
    const tipo = detectarTipoPagina()
    let preview = null
    if (tipo === 'perfil') { extrairPerfilIndividualCompleto().then(dados => { sendResponse({ tipo, preview: { name: dados.name } }) }) }
    else if (tipo === 'busca') { const leads = extrairListaDeBusca(); sendResponse({ tipo, preview: { total: leads.length } }) }
    else sendResponse({ tipo, preview: null })
    return true
  }
  if (request.action === 'extrairPerfil') {
    abrirEExtrairContato().then(dados => sendResponse({ sucesso: true, dados }))
    return true
  }
  if (request.action === 'extrairBusca') {
    const leads = extrairListaDeBusca()
    sendResponse({ sucesso: true, leads, total: leads.length })
  }
  if (request.action === 'enviarMensagemLinkedIn') {
    enviarMensagemLinkedIn(request.texto).then(resultado => sendResponse(resultado))
    return true
  }
  return true
})
