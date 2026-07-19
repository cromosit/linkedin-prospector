// popup.js v2.0 — LinkedIn Prospector — Cromosit IT
// Captura individual, massa, refresh, exclusão em massa, IA, WhatsApp

const API_URL = 'http://localhost:3000'
let perfilAtual      = null
let leadIdCapturado  = null
let tipoPagina       = 'outro'
let leadsBusca       = []

const els = {
  telaOutro:        document.getElementById('telaOutro'),
  telaPerfil:       document.getElementById('telaPerfil'),
  telaBusca:        document.getElementById('telaBusca'),
  profileName:      document.getElementById('profileName'),
  profileHeadline:  document.getElementById('profileHeadline'),
  profileCompany:   document.getElementById('profileCompany'),
  profileLocation:  document.getElementById('profileLocation'),
  profileDegree:    document.getElementById('profileDegree'),
  profileMutual:    document.getElementById('profileMutual'),
  avatarContainer:  document.getElementById('avatarContainer'),
  temperature:      document.getElementById('temperature'),
  notes:            document.getElementById('notes'),
  btnCapture:       document.getElementById('btnCapture'),
  btnCaptureText:   document.getElementById('btnCaptureText'),
  btnSpinner:       document.getElementById('btnSpinner'),
  btnAI:            document.getElementById('btnAI'),
  msgBox:           document.getElementById('msgBox'),
  msgText:          document.getElementById('msgText'),
  btnCopy:          document.getElementById('btnCopy'),
  btnWhatsApp:      document.getElementById('btnWhatsApp'),
  successMsg:       document.getElementById('successMsg'),
  errorMsg:         document.getElementById('errorMsg'),
  totalEncontrado:  document.getElementById('totalEncontrado'),
  listaLeads:       document.getElementById('listaLeads'),
  btnCaptureAll:    document.getElementById('btnCaptureAll'),
  btnCaptureSelected: document.getElementById('btnCaptureSelected'),
  bulkProgress:     document.getElementById('bulkProgress'),
  bulkResult:       document.getElementById('bulkResult'),
  tokenInput:       document.getElementById('tokenInput'),
  btnSaveToken:     document.getElementById('btnSaveToken'),
  statusDot:        document.getElementById('statusDot'),
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  const { token } = await chrome.storage.local.get('token')
  if (token) els.tokenInput.value = token

  verificarAPI()
  await iniciarDeteccao()
})

async function iniciarDeteccao() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab.url || !tab.url.includes('linkedin.com')) {
    mostrarTela('outro')
    return
  }
  chrome.tabs.sendMessage(tab.id, { action: 'detectarPagina' }, (response) => {
    if (!response) { mostrarTela('outro'); return }
    tipoPagina = response.tipo
    if (tipoPagina === 'perfil') {
      mostrarTela('perfil')
      carregarPerfilIndividual(tab)
    } else if (tipoPagina === 'busca') {
      mostrarTela('busca')
      carregarResultadosBusca(tab)
    } else {
      mostrarTela('outro')
    }
  })
}

// ==========================================
// CONTROLE DE TELAS
// ==========================================
function mostrarTela(tela) {
  els.telaOutro.style.display  = tela === 'outro'  ? 'block' : 'none'
  els.telaPerfil.style.display = tela === 'perfil' ? 'block' : 'none'
  els.telaBusca.style.display  = tela === 'busca'  ? 'block' : 'none'
}

// ==========================================
// BOTÃO REFRESH
// ==========================================
document.getElementById('btnRefresh')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnRefresh')
  btn.classList.add('spinning')
  if (els.bulkResult)   { els.bulkResult.style.display   = 'none' }
  if (els.bulkProgress) { els.bulkProgress.style.display = 'none' }
  await iniciarDeteccao()
  setTimeout(() => btn.classList.remove('spinning'), 600)
})

// ==========================================
// PERFIL INDIVIDUAL
// ==========================================
function carregarPerfilIndividual(tab) {
  chrome.tabs.sendMessage(tab.id, { action: 'extrairPerfil' }, (response) => {
    if (!response?.dados?.name) { mostrarTela('outro'); return }

    perfilAtual = response.dados
    const d = perfilAtual

    els.profileName.textContent     = d.name     || '—'
    els.profileHeadline.textContent = d.headline || ''
    els.profileCompany.textContent  = d.company  || ''
    els.profileLocation.textContent = d.location || ''

    const grauCores  = { '1': '#00c896', '2': '#1d8fe8', '3': '#8899aa' }
    const grauLabels = { '1': '1º Grau — Conexão direta', '2': '2º Grau — Amigo de amigo', '3': '3º Grau — Fora da rede' }
    els.profileDegree.textContent   = grauLabels[d.connection_degree] || '3º Grau'
    els.profileDegree.style.color   = grauCores[d.connection_degree]  || '#8899aa'

    if (d.mutual_connections) {
      els.profileMutual.textContent   = d.mutual_connections
      els.profileMutual.style.display = 'block'
    }

    els.temperature.value = d.temperature || 'frio'

    if (d.profile_picture) {
      const img = document.createElement('img')
      img.className = 'profile-avatar'
      img.src = d.profile_picture
      els.avatarContainer.innerHTML = ''
      els.avatarContainer.appendChild(img)
    } else {
      els.avatarContainer.innerHTML = `<div class="profile-avatar-placeholder">${(d.name[0] || '?').toUpperCase()}</div>`
    }
  })
}

// ==========================================
// LISTA DE BUSCA EM MASSA
// ==========================================
function carregarResultadosBusca(tab) {
  els.totalEncontrado.textContent = 'Detectando leads...'
  els.listaLeads.innerHTML = '<div class="loading-item">Extraindo perfis da página...</div>'

  chrome.tabs.sendMessage(tab.id, { action: 'extrairBusca' }, (response) => {
    if (!response?.leads || response.leads.length === 0) {
      els.totalEncontrado.textContent = 'Nenhum perfil encontrado'
      els.listaLeads.innerHTML = '<div class="loading-item">Role a página para carregar mais resultados e atualize.</div>'
      return
    }

    leadsBusca = response.leads
    const total = leadsBusca.length
    const graus = { '1': 0, '2': 0, '3': 0 }
    leadsBusca.forEach(l => graus[l.connection_degree || '3']++)

    els.totalEncontrado.innerHTML = `
      <strong>${total} perfis</strong> encontrados —
      <span style="color:#00c896">●${graus['1']} 1º</span>
      <span style="color:#1d8fe8">●${graus['2']} 2º</span>
      <span style="color:#8899aa">●${graus['3']} 3º</span>
    `

    els.listaLeads.innerHTML = ''
    leadsBusca.forEach((lead, i) => {
      const grauCor = { '1': '#00c896', '2': '#1d8fe8', '3': '#8899aa' }[lead.connection_degree] || '#8899aa'
      const item = document.createElement('div')
      item.className = 'lead-item'
      item.innerHTML = `
        <input type="checkbox" class="lead-checkbox" data-index="${i}" checked />
        <div class="lead-info">
          <div class="lead-name">${lead.name}</div>
          <div class="lead-sub">${lead.headline || ''}</div>
          ${lead.company           ? `<div class="lead-company">🏢 ${lead.company}</div>`           : ''}
          ${lead.location          ? `<div class="lead-sub">📍 ${lead.location}</div>`              : ''}
          ${lead.mutual_connections? `<div class="lead-sub">👥 ${lead.mutual_connections}</div>`    : ''}
        </div>
        <div class="lead-degree" style="color:${grauCor}">●${lead.connection_degree}º</div>
      `
      els.listaLeads.appendChild(item)
    })
  })
}

// ==========================================
// CAPTURAR LEADS (todos ou selecionados)
// ==========================================
document.getElementById('btnCaptureAll')?.addEventListener('click',      () => capturarLeads(false))
document.getElementById('btnCaptureSelected')?.addEventListener('click', () => capturarLeads(true))

async function capturarLeads(apenasChecados) {
  const { token } = await chrome.storage.local.get('token')
  if (!token) { alert('Cole seu token JWT nas configurações.'); return }

  let leads = leadsBusca
  if (apenasChecados) {
    const checkboxes = document.querySelectorAll('.lead-checkbox:checked')
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index))
    leads = indices.map(i => leadsBusca[i])
  }

  if (leads.length === 0) { alert('Nenhum lead selecionado.'); return }

  els.bulkProgress.style.display  = 'block'
  els.bulkProgress.textContent    = `Enviando ${leads.length} leads...`
  els.btnCaptureAll.disabled      = true
  els.btnCaptureSelected.disabled = true

  try {
    const res = await fetch(`${API_URL}/api/leads/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ leads })
    })
    const data = await res.json()

    if (res.ok) {
      els.bulkProgress.style.display = 'none'
      els.bulkResult.style.display   = 'block'
      els.bulkResult.style.color     = '#00c896'
      els.bulkResult.textContent     = `✅ ${data.leads.length} leads capturados!`
      await notificarVendedor(token, data.leads)
    } else {
      throw new Error(data.error)
    }
  } catch (err) {
    els.bulkProgress.style.display = 'none'
    els.bulkResult.style.display   = 'block'
    els.bulkResult.style.color     = '#ff3b5c'
    els.bulkResult.textContent     = '❌ Erro: ' + err.message
  } finally {
    els.btnCaptureAll.disabled      = false
    els.btnCaptureSelected.disabled = false
  }
}

// ==========================================
// EXCLUSÃO EM MASSA
// ==========================================
document.getElementById('btnDeleteMass')?.addEventListener('click', () => {
  const count = document.querySelectorAll('.lead-checkbox:checked').length
  if (count === 0) { alert('Selecione ao menos um lead para excluir.'); return }
  const modalCount = document.getElementById('modalCount')
  if (modalCount) modalCount.textContent = `${count} lead${count > 1 ? 's' : ''}`
  document.getElementById('modalDelete')?.classList.add('visible')
})

document.getElementById('modalCancel')?.addEventListener('click', () => {
  document.getElementById('modalDelete')?.classList.remove('visible')
})

document.getElementById('modalConfirm')?.addEventListener('click', async () => {
  const { token } = await chrome.storage.local.get('token')
  if (!token) { document.getElementById('modalDelete')?.classList.remove('visible'); alert('Configure o token.'); return }

  const checkboxes     = document.querySelectorAll('.lead-checkbox:checked')
  const indices        = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index))
  const leadsParaDel   = indices.map(i => leadsBusca[i]).filter(l => l && l.linkedin_id)

  if (leadsParaDel.length === 0) { document.getElementById('modalDelete')?.classList.remove('visible'); return }

  const confirmBtn    = document.getElementById('modalConfirm')
  const confirmText   = document.getElementById('modalConfirmText')
  const confirmSpinner= document.getElementById('modalSpinner')
  confirmBtn.disabled = true
  if (confirmText)    confirmText.style.display    = 'none'
  if (confirmSpinner) confirmSpinner.style.display = 'inline-block'

  let deletados = 0, erros = 0

  for (const lead of leadsParaDel) {
    try {
      const busca = await fetch(`${API_URL}/api/leads?search=${encodeURIComponent(lead.name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const dadosBusca = await busca.json()
      const leadCRM = dadosBusca?.leads?.find(l => l.linkedin_id === lead.linkedin_id || l.linkedin_url === lead.linkedin_url)

      if (leadCRM?.id) {
        const del = await fetch(`${API_URL}/api/leads/${leadCRM.id}`, {
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        })
        del.ok ? deletados++ : erros++
      } else { erros++ }
    } catch { erros++ }
  }

  document.getElementById('modalDelete')?.classList.remove('visible')
  confirmBtn.disabled = false
  if (confirmText)    confirmText.style.display    = 'inline'
  if (confirmSpinner) confirmSpinner.style.display = 'none'

  if (els.bulkResult) {
    els.bulkResult.style.display = 'block'
    if (deletados > 0 && erros === 0) {
      els.bulkResult.style.color = '#00c896'
      els.bulkResult.textContent = `✅ ${deletados} lead${deletados > 1 ? 's' : ''} excluído${deletados > 1 ? 's' : ''}!`
    } else if (deletados > 0) {
      els.bulkResult.style.color = '#ff6b35'
      els.bulkResult.textContent = `⚠️ ${deletados} excluídos, ${erros} não encontrados no CRM`
    } else {
      els.bulkResult.style.color = '#ff3b5c'
      els.bulkResult.textContent = `❌ Leads não encontrados no CRM. Capture-os primeiro.`
    }
  }
})

// ==========================================
// CAPTURAR PERFIL INDIVIDUAL
// ==========================================
els.btnCapture?.addEventListener('click', async () => {
  if (!perfilAtual) return
  const { token } = await chrome.storage.local.get('token')
  if (!token) { mostrarErro('Cole seu token JWT nas configurações.'); return }

  setCarregando(true)
  esconderMensagens()

  try {
    const res = await fetch(`${API_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ...perfilAtual,
        temperature: els.temperature.value,
        notes:       els.notes.value,
        source:      'chrome_extension'
      })
    })
    const data = await res.json()
    if (res.ok) {
      leadIdCapturado = data.lead.id
      mostrarSucesso(`✅ ${perfilAtual.name} capturado!`)
      els.btnCapture.style.display = 'none'
      els.btnAI.style.display      = 'block'
    } else {
      mostrarErro(data.error || 'Erro ao capturar.')
    }
  } catch (err) {
    mostrarErro('Erro de conexão com o backend.')
  } finally {
    setCarregando(false)
  }
})

// ==========================================
// GERAR MENSAGEM COM IA
// ==========================================
els.btnAI?.addEventListener('click', async () => {
  if (!leadIdCapturado) return
  const { token } = await chrome.storage.local.get('token')

  els.btnAI.textContent = '⟳ Gerando...'
  els.btnAI.disabled    = true

  try {
    const res = await fetch(`${API_URL}/api/leads/${leadIdCapturado}/gerar-mensagem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        tipo: perfilAtual?.connection_degree === '1' ? 'primeiro_contato'
            : perfilAtual?.connection_degree === '2' ? 'conexao_com_comum'
            : 'conexao'
      })
    })
    const data = await res.json()
    if (res.ok) {
      els.msgText.textContent = data.mensagem
      els.msgBox.classList.add('visible')
      els.btnWhatsApp.style.display = 'block'
    } else {
      mostrarErro('Erro ao gerar mensagem.')
    }
  } catch {
    mostrarErro('Erro de conexão.')
  } finally {
    els.btnAI.textContent = '✦ Gerar mensagem com IA'
    els.btnAI.disabled    = false
  }
})

// ==========================================
// COPIAR MENSAGEM
// ==========================================
els.btnCopy?.addEventListener('click', () => {
  navigator.clipboard.writeText(els.msgText.textContent).then(() => {
    els.btnCopy.textContent = '✅ Copiado!'
    setTimeout(() => { els.btnCopy.textContent = '📋 Copiar' }, 2000)
  })
})

// ==========================================
// SALVAR TOKEN
// ==========================================
els.btnSaveToken?.addEventListener('click', async () => {
  const token = els.tokenInput.value.trim()
  if (!token) return
  await chrome.storage.local.set({ token })
  els.btnSaveToken.textContent = '✅ Salvo!'
  setTimeout(() => { els.btnSaveToken.textContent = 'Salvar token' }, 2000)
})

// ==========================================
// VERIFICAR API
// ==========================================
async function verificarAPI() {
  try {
    const res = await fetch(`${API_URL}/health`)
    els.statusDot.style.background = res.ok ? '#00c896' : '#ff3b5c'
    els.statusDot.title = res.ok ? 'API online ✅' : 'API offline ❌'
  } catch {
    els.statusDot.style.background = '#ff3b5c'
    els.statusDot.title = 'API offline — rode o backend'
  }
}

// ==========================================
// NOTIFICAR VENDEDOR
// ==========================================
async function notificarVendedor(token, leads) {
  try {
    const graus = { '1': [], '2': [], '3': [] }
    leads.forEach(l => graus[l.connection_degree || '3'].push(l.name))

    const resumo = `🔔 *LinkedIn Prospector — Cromosit IT*\n\n` +
      `*${leads.length} novos leads capturados!*\n\n` +
      (graus['1'].length ? `🟢 *1º Grau (${graus['1'].length}):*\n${graus['1'].slice(0,5).join(', ')}${graus['1'].length > 5 ? '...' : ''}\n\n` : '') +
      (graus['2'].length ? `🔵 *2º Grau (${graus['2'].length}):*\n${graus['2'].slice(0,5).join(', ')}${graus['2'].length > 5 ? '...' : ''}\n\n` : '') +
      (graus['3'].length ? `⚪ *3º Grau (${graus['3'].length}):*\n${graus['3'].slice(0,5).join(', ')}${graus['3'].length > 5 ? '...' : ''}\n\n` : '') +
      `Acesse: http://localhost:5174/leads`

    await fetch(`${API_URL}/api/notificar-vendedor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ mensagem: resumo })
    })
  } catch (e) {
    console.warn('Notificação não enviada:', e)
  }
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function setCarregando(v) {
  els.btnCaptureText.style.display = v ? 'none' : 'inline'
  els.btnSpinner.style.display     = v ? 'inline-block' : 'none'
  els.btnCapture.disabled          = v
}
function mostrarSucesso(msg) {
  els.successMsg.textContent = msg
  els.successMsg.classList.add('visible')
  els.errorMsg.classList.remove('visible')
}
function mostrarErro(msg) {
  els.errorMsg.textContent = msg
  els.errorMsg.classList.add('visible')
  els.successMsg.classList.remove('visible')
}
function esconderMensagens() {
  els.successMsg.classList.remove('visible')
  els.errorMsg.classList.remove('visible')
}
