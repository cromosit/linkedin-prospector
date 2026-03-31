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

  // GRAU DE CONEXÃO
  const bodyTxt = document.body.innerText || ''
  if (bodyTxt.includes('• 1º') || bodyTxt.includes('1st')) dados.connection_degree = '1'
  else if (bodyTxt.includes('• 2º') || bodyTxt.includes('2nd')) dados.connection_degree = '2'
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
// EXTRAI INFORMAÇÕES DE CONTATO
// Funciona quando o modal de contato está aberto
// ==========================================
function extrairInfoContato(dados) {
  // Email via href
  const emailEl = document.querySelector('a[href^="mailto:"]')
  if (emailEl) dados.email = emailEl.href.replace('mailto:', '').trim()

  // Telefone via tel: link
  const phoneEl = document.querySelector('a[href^="tel:"]')
  if (phoneEl) dados.phone = phoneEl.href.replace('tel:', '').trim()

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
      // Aceita somente se parecer com número de telefone
      const apenasNumeros = valor.replace(/\D/g, '')
      if (apenasNumeros.length >= 8) dados.phone = valor
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
      dados.phone = value.replace(/\(.*?\)/g, '').trim()
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
      let container = link

      for (let i = 0; i < 10; i++) {
        container = container.parentElement
        if (!container || container.tagName === 'BODY') break
        const texto = container.innerText || ''

        if (!lead.name) {
          const nomeSpan = link.querySelector('span[aria-hidden="true"]') || link.querySelector('span')
          const nomeTexto = nomeSpan?.innerText?.trim() || link.innerText?.trim()
          if (nomeTexto && nomeTexto.length > 1 && nomeTexto.length < 80 && !nomeTexto.includes('•') && !nomeTexto.includes('º')) lead.name = nomeTexto
        }

        if (!lead.headline) {
          const subs = container.querySelectorAll('[class*="subtitle"],[class*="headline"],.t-14.t-black')
          subs.forEach(s => { const t = s.innerText?.trim(); if (t && t.length > 3 && t.length < 200 && !lead.headline && !t.includes('conexões') && !t.includes('seguidores') && !t.includes('•')) lead.headline = t })
        }

        if (!lead.profile_picture) {
          const img = container.querySelector('img')
          if (img?.src && img.src.startsWith('https') && !img.src.includes('ghost') && (img.src.includes('media') || img.src.includes('profile'))) lead.profile_picture = img.src
        }

        if (!lead.connection_degree) {
          if (texto.includes('• 1º')||texto.includes('1st')) lead.connection_degree='1'
          else if (texto.includes('• 2º')||texto.includes('2nd')) lead.connection_degree='2'
          else if (texto.includes('3º e +')||texto.includes('3rd')||texto.includes('• 3')) lead.connection_degree='3'
        }

        if (!lead.mutual_connections) { const m = texto.match(/(\d+)\s+conex[õo]es? em comum/i); if (m) lead.mutual_connections = m[0] }

        // Localização real (tem vírgula + local geográfico)
        if (!lead.location) {
          const locMatch = texto.match(/([A-ZÀ-Ü][a-zà-ü]+(?: [A-ZÀ-Ü][a-zà-ü]+)*,\s*(?:Brasil|[A-Z][a-zà-ü]+(?: [A-ZÀ-Ü][a-zà-ü]+)*))/u)
          if (locMatch && !locMatch[0].includes('Jacinto') && locMatch[0].length < 50) lead.location = locMatch[0]
        }

        if (lead.name && lead.connection_degree) break
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
  if (!acao) return

  await esperar(2500) // aguarda a página carregar completamente

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
