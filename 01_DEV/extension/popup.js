// popup.js v6 — com botão enviar no LinkedIn

const APP_VERSION = '4.3.0';
const API_URL = 'http://localhost:3001'
let perfilAtual = null
let leadIdCapturado = null
let tipoPagina = 'outro'
let leadsBusca = []

const els = {
  telaOutro: document.getElementById('telaOutro'),
  telaPerfil: document.getElementById('telaPerfil'),
  telaBusca: document.getElementById('telaBusca'),
  profileName: document.getElementById('profileName'),
  profileHeadline: document.getElementById('profileHeadline'),
  profileCompany: document.getElementById('profileCompany'),
  profileLocation: document.getElementById('profileLocation'),
  profileDegree: document.getElementById('profileDegree'),
  profileMutual: document.getElementById('profileMutual'),
  avatarContainer: document.getElementById('avatarContainer'),
  temperature: document.getElementById('temperature'),
  notes: document.getElementById('notes'),
  btnCapture: document.getElementById('btnCapture'),
  btnCaptureText: document.getElementById('btnCaptureText'),
  btnSpinner: document.getElementById('btnSpinner'),
  btnAI: document.getElementById('btnAI'),
  msgBox: document.getElementById('msgBox'),
  msgText: document.getElementById('msgText'),
  btnCopy: document.getElementById('btnCopy'),
  btnWhatsApp: document.getElementById('btnWhatsApp'),
  btnLinkedInMsg: document.getElementById('btnLinkedInMsg'),
  btnConnect: document.getElementById('btnConnect'),
  successMsg: document.getElementById('successMsg'),
  errorMsg: document.getElementById('errorMsg'),
  totalEncontrado: document.getElementById('totalEncontrado'),
  listaLeads: document.getElementById('listaLeads'),
  btnCaptureAll: document.getElementById('btnCaptureAll'),
  btnCaptureSelected: document.getElementById('btnCaptureSelected'),
  bulkProgress: document.getElementById('bulkProgress'),
  bulkResult: document.getElementById('bulkResult'),
  tokenInput: document.getElementById('tokenInput'),
  btnSaveToken: document.getElementById('btnSaveToken'),
  statusDot: document.getElementById('statusDot'),
  groupName: document.getElementById('groupName'),
  groupNameBulk: document.getElementById('groupNameBulk'),
  campaignId: document.getElementById('campaignId'),
  campaignIdBulk: document.getElementById('campaignIdBulk'),
  btnRetry: document.getElementById('btnRetry'),
}

document.addEventListener('DOMContentLoaded', async () => {
  const { token } = await chrome.storage.local.get('token')
  atualizarStatusToken(token)
  verificarAPI()
  if (token) carregarCampanhas(token)
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab.url || !tab.url.includes('linkedin.com')) { mostrarTela('outro'); return }

  async function detectar() {
    chrome.tabs.sendMessage(tab.id, { action: 'detectarPagina' }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        console.warn('⚠️ Robô não respondeu. Tentando injeção forçada...');
        
        try {
          // Tenta injetar o script à força se ele não estiver lá
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          // Espera um pouco e tenta falar de novo
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'detectarPagina' }, (resp2) => {
              if (resp2) {
                tipoPagina = resp2.tipo;
                processarTipoPagina(tab, tipoPagina);
              } else {
                usarFallbackURL(tab);
              }
            });
          }, 500);
        } catch (e) {
          console.error('Falha na injeção forçada:', e);
          usarFallbackURL(tab);
        }
        return;
      }

      tipoPagina = response.tipo
      processarTipoPagina(tab, tipoPagina);
    })
  }

  function usarFallbackURL(tab) {
    const isPerfil = tab.url.includes('/in/');
    const isBusca = tab.url.includes('/search/');
    if (isPerfil) { tipoPagina = 'perfil'; mostrarTela('perfil'); carregarPerfilIndividual(tab) }
    else if (isBusca) { tipoPagina = 'busca'; mostrarTela('busca'); carregarResultadosBusca(tab) }
    else { mostrarTela('outro') }
  }

  function processarTipoPagina(tab, tipo) {
    if (tipo === 'perfil') { mostrarTela('perfil'); carregarPerfilIndividual(tab) }
    else if (tipo === 'busca') { mostrarTela('busca'); carregarResultadosBusca(tab) }
    else mostrarTela('outro')
  }

  detectar();
})

function atualizarStatusToken(token) {
  const syncStatus = document.getElementById('syncStatus')
  const btnOpenApp = document.getElementById('btnOpenApp')
  const tokenManual = document.getElementById('tokenManual')
  const tokenInput = document.getElementById('tokenInput')
  
  if (token) {
    syncStatus.textContent = '✅ Sincronizado com o app'
    syncStatus.style.color = '#00c896'
    btnOpenApp.style.display = 'none'
    if (tokenInput) tokenInput.value = token
  } else {
    syncStatus.textContent = '⚠️ Não autenticado — faça login no app'
    syncStatus.style.color = '#ff6b35'
    btnOpenApp.style.display = 'block'
    if (tokenInput) tokenInput.value = ''
  }
}

document.getElementById('btnOpenApp')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5174' })
})

let listaDeCampanhas = []

function selecionarCampanhaPorGrau(grau) {
  if (!grau || !listaDeCampanhas || listaDeCampanhas.length === 0) return;
  const matching = listaDeCampanhas.find(c => String(c.target_degree) === String(grau));
  if (matching && els.campaignId) {
    els.campaignId.value = matching.id;
  }
}

async function carregarCampanhas(token) {
  try {
    const res = await fetch(`${API_URL}/api/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    listaDeCampanhas = Array.isArray(data) ? data : (data.campaigns || [])
    
    const html = ['<option value="">— Sem campanha —</option>']
    listaDeCampanhas.forEach(c => {
      const degreeLabel = c.target_degree === '1' ? '1º Grau' : c.target_degree === '2' ? '2º Grau' : c.target_degree === '3' ? '3º Grau' : 'Todos';
      html.push(`<option value="${c.id}">${c.name} (${degreeLabel})</option>`)
    })
    
    if (els.campaignId) els.campaignId.innerHTML = html.join('')
    if (els.campaignIdBulk) els.campaignIdBulk.innerHTML = html.join('')
    
    if (perfilAtual && perfilAtual.connection_degree) {
      selecionarCampanhaPorGrau(perfilAtual.connection_degree);
    }
  } catch (err) { console.error('Erro ao carregar campanhas:', err) }
}

function mostrarTela(tela) {
  els.telaOutro.style.display = tela === 'outro' ? 'block' : 'none'
  els.telaPerfil.style.display = tela === 'perfil' ? 'block' : 'none'
  els.telaBusca.style.display = tela === 'busca' ? 'block' : 'none'
}

function carregarPerfilIndividual(tab) {
  chrome.tabs.sendMessage(tab.id, { action: 'extrairPerfil' }, (response) => {
    if (!response?.dados?.name) { mostrarErro('Não foi possível ler os dados. Tente dar F5!'); return }
    perfilAtual = response.dados
    const d = perfilAtual
    els.profileName.textContent = d.name || '—'
    els.profileHeadline.textContent = d.headline || ''
    els.profileCompany.textContent = d.company || ''
    els.profileLocation.textContent = d.location || ''
    
    const grauCores = { '1': '#00c896', '2': '#1d8fe8', '3': '#8899aa' }
    els.profileDegree.textContent = d.connection_degree === '1' ? '🟢 1º Grau' : d.connection_degree === '2' ? '🔵 2º Grau' : '⚪ 3º Grau'
    els.profileDegree.style.color = grauCores[d.connection_degree] || '#8899aa'
    
    if (d.profile_picture) {
      els.avatarContainer.innerHTML = `<img class="profile-avatar" src="${d.profile_picture}" />`
    } else {
      els.avatarContainer.innerHTML = `<div class="profile-avatar-placeholder">${d.name[0]}</div>`
    }

    selecionarCampanhaPorGrau(d.connection_degree);

    if (d.connection_degree === '1') {
      els.btnLinkedInMsg.style.display = 'block'
      els.btnConnect.style.display = 'none'
    } else {
      els.btnLinkedInMsg.style.display = 'none'
      els.btnConnect.style.display = 'block'
    }
  })
}

function carregarResultadosBusca(tab) {
  chrome.tabs.sendMessage(tab.id, { action: 'extrairBusca' }, (response) => {
    if (!response?.leads || response.leads.length === 0) {
      els.totalEncontrado.textContent = 'Nenhum perfil encontrado nesta página'
      return
    }
    leadsBusca = response.leads
    els.totalEncontrado.textContent = `${leadsBusca.length} perfis encontrados`
    els.listaLeads.innerHTML = ''
    leadsBusca.forEach((lead, i) => {
      const item = document.createElement('div')
      item.className = 'lead-item'
      item.style.cursor = 'pointer'
      item.innerHTML = `
        <input type="checkbox" class="lead-checkbox" data-index="${i}" checked />
        <div class="lead-info">
          <div class="lead-name">${lead.name}</div>
          <div class="lead-sub">${lead.headline || ''}</div>
        </div>
        <div class="lead-degree">${lead.connection_degree}º</div>
      `
      
      // Permitir clicar em qualquer parte da linha para marcar/desmarcar
      item.addEventListener('click', (e) => {
        const checkbox = item.querySelector('.lead-checkbox')
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked
        }
      })

      els.listaLeads.appendChild(item)
    })
  })
}

els.btnCapture?.addEventListener('click', async () => {
  const { token } = await chrome.storage.local.get('token')
  if (!token) { mostrarErro('🔐 Faça login ou cole seu token nas configurações.'); return }
  if (!perfilAtual) return

  setCarregando(true); esconderMensagens();
  try {
    const res = await fetch(`${API_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        ...perfilAtual, 
        temperature: els.temperature.value, 
        notes: els.notes.value, 
        group_name: els.groupName.value || 'Geral',
        campaign_id: els.campaignId.value || null,
        source: 'chrome_extension' 
      })
    })
    const data = await res.json()
    if (res.ok) {
      leadIdCapturado = data.lead.id
      mostrarSucesso(`✅ ${perfilAtual.name} capturado!`)
      els.btnCapture.style.display = 'none'
      els.btnAI.style.display = 'block'
    } else { throw new Error(data.error || 'Erro ao capturar.') }
  } catch (err) { mostrarErro(err.message) }
  finally { setCarregando(false) }
})

els.btnCaptureAll?.addEventListener('click', async () => {
  const { token } = await chrome.storage.local.get('token')
  if (!token) { mostrarErro('🔐 Token não encontrado.'); return }
  
  els.btnCaptureAll.disabled = true;
  els.btnCaptureAll.textContent = '⏳ Enviando...';
  
  try {
    const res = await fetch(`${API_URL}/api/leads/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        leads: leadsBusca, 
        group_name: els.groupNameBulk.value || 'Busca Massa',
        campaign_id: els.campaignIdBulk.value || null
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      mostrarSucesso(`✅ ${data.leads.length} leads enviados para o CRM!`);
      els.btnCaptureAll.style.display = 'none';
      els.btnCaptureSelected.style.display = 'none';
    } else {
      mostrarErro('❌ Erro ao enviar lote.');
    }
  } catch (e) {
    mostrarErro('❌ Erro de rede.');
  } finally {
    els.btnCaptureAll.disabled = false;
    els.btnCaptureAll.textContent = '⬇ Capturar Todos';
  }
});

els.btnCaptureSelected?.addEventListener('click', async () => {
  const { token } = await chrome.storage.local.get('token')
  if (!token) { mostrarErro('🔐 Token não encontrado.'); return }
  
  const checkboxes = document.querySelectorAll('.lead-checkbox:checked');
  const indexes = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-index')));
  const selectedLeads = leadsBusca.filter((_, idx) => indexes.includes(idx));
  
  if (selectedLeads.length === 0) {
    mostrarErro('⚠️ Nenhum lead selecionado.');
    return;
  }
  
  els.btnCaptureSelected.disabled = true;
  els.btnCaptureSelected.textContent = '⏳ Enviando...';
  
  try {
    const res = await fetch(`${API_URL}/api/leads/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        leads: selectedLeads, 
        group_name: els.groupNameBulk.value || 'Busca Massa',
        campaign_id: els.campaignIdBulk.value || null
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      mostrarSucesso(`✅ ${data.leads.length} leads selecionados enviados!`);
      els.btnCaptureSelected.style.display = 'none';
      els.btnCaptureAll.style.display = 'none';
    } else {
      mostrarErro('❌ Erro ao enviar lote.');
    }
  } catch (e) {
    mostrarErro('❌ Erro de rede.');
  } finally {
    els.btnCaptureSelected.disabled = false;
    els.btnCaptureSelected.textContent = 'Selecionados';
  }
});

els.btnAI?.addEventListener('click', async () => {
  if (!leadIdCapturado) return
  const { token } = await chrome.storage.local.get('token')
  els.btnAI.textContent = '⟳ Gerando...'; els.btnAI.disabled = true
  try {
    const res = await fetch(`${API_URL}/api/leads/${leadIdCapturado}/gerar-mensagem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ tipo: perfilAtual?.connection_degree === '1' ? 'primeiro_contato' : 'conexao' })
    })
    const data = await res.json()
    if (res.ok) {
      els.msgText.textContent = data.mensagem
      els.msgBox.classList.add('visible')
      els.btnWhatsApp.style.display = 'block'
    } else { mostrarErro('Erro ao gerar mensagem.') }
  } catch (err) { mostrarErro('Erro de conexão.') }
  finally { els.btnAI.textContent = '✦ Gerar mensagem com IA'; els.btnAI.disabled = false }
})

els.btnCopy?.addEventListener('click', () => {
  navigator.clipboard.writeText(els.msgText.textContent).then(() => {
    els.btnCopy.textContent = '✅ Copiado!'
    setTimeout(() => { els.btnCopy.textContent = '📋 Copiar' }, 2000)
  })
})

els.btnWhatsApp?.addEventListener('click', () => {
  const msg = els.msgText.textContent
  if (!perfilAtual?.phone) {
    mostrarErro('❌ Telefone não encontrado no perfil.')
    return
  }
  let cleanPhone = perfilAtual.phone.replace(/\D/g, '')
  if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone
  const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
  chrome.tabs.create({ url })
})

els.btnLinkedInMsg?.addEventListener('click', async () => {
  const mensagem = els.msgText.textContent
  if (!mensagem) return
  els.btnLinkedInMsg.textContent = '⟳ Abrindo chat...'
  els.btnLinkedInMsg.disabled = true
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.tabs.sendMessage(tab.id, { action: 'enviarMensagemLinkedIn', texto: mensagem }, (response) => {
    if (response && response.sucesso) {
      chrome.storage.local.get('token', ({ token }) => {
        fetch(`${API_URL}/api/leads/${leadIdCapturado}/registrar-contato-linkedin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ mensagem })
        })
      })
    } else {
      mostrarErro(response?.erro || 'Não foi possível abrir o chat.')
    }
    els.btnLinkedInMsg.textContent = '💬 Enviar no LinkedIn'
    els.btnLinkedInMsg.disabled = false
  })
})

els.btnSaveToken?.addEventListener('click', async () => {
  const tokenInput = document.getElementById('tokenInput')
  const token = tokenInput?.value.trim()
  if (!token) return
  await chrome.storage.local.set({ token })
  atualizarStatusToken(token)
  const btn = document.getElementById('btnSaveToken')
  btn.textContent = '✅ Salvo!'
  setTimeout(() => { btn.textContent = 'Salvar token' }, 2000)
})

async function verificarAPI() {
  try {
    const res = await fetch(`${API_URL}/health`)
    els.statusDot.style.background = res.ok ? '#00c896' : '#ff3b5c'
  } catch { els.statusDot.style.background = '#ff3b5c' }
}

function setCarregando(v) {
  els.btnCaptureText.style.display = v ? 'none' : 'inline'
  els.btnSpinner.style.display = v ? 'inline-block' : 'none'
  els.btnCapture.disabled = v
}
function mostrarSucesso(msg) { els.successMsg.textContent = msg; els.successMsg.classList.add('visible'); els.errorMsg.classList.remove('visible') }
function mostrarErro(msg) { els.errorMsg.textContent = msg; els.errorMsg.classList.add('visible'); els.successMsg.classList.remove('visible') }
function esconderMensagens() { els.successMsg.classList.remove('visible'); els.errorMsg.classList.remove('visible') }

els.btnConnect?.addEventListener('click', async () => {
  const campId = els.campaignId.value
  const camp = listaDeCampanhas.find(c => String(c.id) === String(campId))
  const msg = camp?.message_template || ''
  
  if (msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      const url = new URL(tab.url)
      url.searchParams.set('lp_action', 'connect')
      url.searchParams.set('lp_msg', encodeURIComponent(msg))
      chrome.tabs.update(tab.id, { url: url.toString() })
    })
    window.close()
  } else {
    alert('Escolha uma campanha com template!')
  }
})

els.btnRetry?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) carregarPerfilIndividual(tabs[0]);
  });
})
