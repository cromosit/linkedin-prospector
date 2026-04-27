// popup.js v6 — com botão enviar no LinkedIn

const API_URL = 'http://localhost:3000'
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

  // 🔄 TENTATIVA DE DETECÇÃO (Com Fallback de URL)
  function detectar() {
    chrome.tabs.sendMessage(tab.id, { action: 'detectarPagina' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        console.warn('⚠️ Content script não respondeu. Usando fallback de URL.');
        // Fallback via URL se o script de conteúdo falhar
        const isPerfil = tab.url.includes('/in/');
        const isBusca = tab.url.includes('/search/results/people/');
        
        if (isPerfil) { tipoPagina = 'perfil'; mostrarTela('perfil'); carregarPerfilIndividual(tab) }
        else if (isBusca) { tipoPagina = 'busca'; mostrarTela('busca'); carregarResultadosBusca(tab) }
        else { mostrarTela('outro') }
        return;
      }

      tipoPagina = response.tipo
      if (tipoPagina === 'perfil') { mostrarTela('perfil'); carregarPerfilIndividual(tab) }
      else if (tipoPagina === 'busca') { mostrarTela('busca'); carregarResultadosBusca(tab, response.preview) }
      else mostrarTela('outro')
    })
  }

  detectar();

  els.btnRetry?.addEventListener('click', () => {
    els.profileName.textContent = '⏳ Lendo...';
    detectar();
  });

  // 🔎 PREENCHIMENTO INTELIGENTE: Detecta o termo de busca (ex: "SAP MM") e preenche o Grupo automaticamente
  if (tab.url.includes('/search/results/people/')) {
    try {
      const urlParams = new URLSearchParams(new URL(tab.url).search);
      const keywords = urlParams.get('keywords');
      if (keywords && els.groupNameBulk) {
        els.groupNameBulk.value = keywords.replace(/"/g, '').trim();
      }
    } catch(e) { console.warn('Erro ao ler keywords:', e) }
  }
})

function atualizarStatusToken(token) {
  const syncStatus = document.getElementById('syncStatus')
  const btnOpenApp = document.getElementById('btnOpenApp')
  const tokenManual = document.getElementById('tokenManual')
  if (token) {
    syncStatus.textContent = '✅ Sincronizado com o app'
    syncStatus.style.color = '#00c896'
    btnOpenApp.style.display = 'none'
    tokenManual.style.display = 'none'
  } else {
    syncStatus.textContent = '⚠️ Não autenticado — faça login no app'
    syncStatus.style.color = '#ff6b35'
    btnOpenApp.style.display = 'block'
    tokenManual.style.display = 'block'
  }
}

document.getElementById('btnOpenApp')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://prospector.cromosit.com' })
})

let listaDeCampanhas = []

async function carregarCampanhas(token) {
  try {
    const res = await fetch(`${API_URL}/api/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    listaDeCampanhas = Array.isArray(data) ? data : (data.campaigns || [])
    
    const html = ['<option value="">— Sem campanha —</option>']
    listaDeCampanhas.forEach(c => {
      html.push(`<option value="${c.id}">${c.name}</option>`)
    })
    
    if (els.campaignId) els.campaignId.innerHTML = html.join('')
    if (els.campaignIdBulk) els.campaignIdBulk.innerHTML = html.join('')
  } catch (err) { console.error('Erro ao carregar campanhas:', err) }
}

// 🎯 AUTO-PREENCHIMENTO: Detecta quando o usuário escolhe uma campanha e carrega o template
els.campaignId?.addEventListener('change', (e) => {
  const campId = e.target.value
  if (!campId) return

  const camp = listaDeCampanhas.find(c => String(c.id) === String(campId))
  if (camp?.message_template) {
    // Mostra a mensagem da campanha na caixa de mensagem
    els.msgBox.classList.add('visible')
    els.msgText.innerHTML = `<div style="color:var(--blue-b);font-size:10px;margin-bottom:5px;font-weight:700">📋 MENSAGEM DA CAMPANHA DE PROSPECÇÃO:</div>` + 
                            camp.message_template.replace(/\n/g, '<br>')
    
    // Mostra o botão de envio se for 1º grau ou se for conexão
    els.btnLinkedInMsg.style.display = 'block'
  }
})

function mostrarTela(tela) {
  els.telaOutro.style.display = tela === 'outro' ? 'block' : 'none'
  els.telaPerfil.style.display = tela === 'perfil' ? 'block' : 'none'
  els.telaBusca.style.display = tela === 'busca' ? 'block' : 'none'
}

function carregarPerfilIndividual(tab) {
  // 1. Abre a tela de perfil imediatamente para evitar travamentos
  mostrarTela('perfil');
  
  chrome.tabs.sendMessage(tab.id, { action: 'extrairPerfil' }, (response) => {
    if (!response?.dados?.name) { 
      console.warn('⚠️ Dados não extraídos, tentando novamente...');
      return 
    }
    
    perfilAtual = response.dados;
    const d = perfilAtual;
    
    // 2. Preenche a UI básica imediatamente
    els.profileName.textContent = d.name || '—'
    els.profileHeadline.textContent = d.headline || ''
    els.profileCompany.textContent = d.company || ''
    els.profileLocation.textContent = d.location || ''
    
    // 3. Verifica existência no CRM em background
    chrome.storage.local.get('token', async ({ token }) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/leads/check/${d.linkedin_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.exists) {
          leadIdCapturado = data.lead.id
          els.btnCapture.style.display = 'none'
          els.btnAI.style.display = 'block'
        } else {
          leadIdCapturado = null
          els.btnCapture.style.display = 'block'
          els.btnAI.style.display = 'none'
        }
      } catch (e) { console.error('Erro na checagem assíncrona:', e) }
    });

    // 4. Esteta e badges
    const grauCores = { '1': '#00c896', '2': '#1d8fe8', '3': '#8899aa' }
    const grauLabels = { '1': '🟢 1º Grau (Direto)', '2': '🔵 2º Grau (Amigo)', '3': '⚪ 3º Grau' }
    els.profileDegree.textContent = grauLabels[d.connection_degree] || '⚪ 3º Grau'
    els.profileDegree.style.color = grauCores[d.connection_degree] || '#8899aa'
    
    if (d.profile_picture) {
      els.avatarContainer.innerHTML = `<img class="profile-avatar" src="${d.profile_picture}" />`
    } else {
      els.avatarContainer.innerHTML = `<div class="profile-avatar-placeholder">${d.name[0]}</div>`
    }

    // 🛡️ GESTÃO DE BOTÕES BASEADA NO GRAU
    const grau = d.connection_degree
    if (grau === '1') {
      els.btnLinkedInMsg.style.display = 'block'
      els.btnConnect.style.display = 'none'
      if (document.getElementById('linkedinTip')) document.getElementById('linkedinTip').style.display = 'none'
    } else {
      els.btnLinkedInMsg.style.display = 'none'
      els.btnConnect.style.display = 'block'
      if (document.getElementById('linkedinTip')) document.getElementById('linkedinTip').style.display = 'block'
    }
  })
}

function carregarResultadosBusca(tab, preview) {
  els.totalEncontrado.textContent = `Detectando leads...`
  els.listaLeads.innerHTML = '<div class="loading-item">Extraindo perfis da página...</div>'
  chrome.tabs.sendMessage(tab.id, { action: 'extrairBusca' }, (response) => {
    if (!response?.leads || response.leads.length === 0) {
      els.totalEncontrado.textContent = 'Nenhum perfil encontrado nesta página'
      els.listaLeads.innerHTML = '<div class="loading-item">Role a página e tente novamente.</div>'
      return
    }
    leadsBusca = response.leads
    const total = leadsBusca.length
    const graus = { '1': 0, '2': 0, '3': 0 }
    leadsBusca.forEach(l => graus[l.connection_degree || '3']++)
    els.totalEncontrado.innerHTML = `<strong>${total} perfis</strong> — <span style="color:#00c896">●${graus['1']} 1º</span> <span style="color:#1d8fe8">●${graus['2']} 2º</span> <span style="color:#8899aa">●${graus['3']} 3º</span>`
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
          ${lead.company ? `<div class="lead-company">🏢 ${lead.company}</div>` : ''}
          ${lead.location ? `<div class="lead-sub">📍 ${lead.location}</div>` : ''}
          ${lead.mutual_connections ? `<div class="lead-sub">👥 ${lead.mutual_connections}</div>` : ''}
        </div>
        <div class="lead-degree" style="color:${grauCor}">●${lead.connection_degree}º</div>
      `
      els.listaLeads.appendChild(item)
    })
  })
}

document.getElementById('btnCaptureAll')?.addEventListener('click', () => capturarLeads(false))
document.getElementById('btnCaptureSelected')?.addEventListener('click', () => capturarLeads(true))

async function capturarLeads(apenasChecados) {
  const { token } = await chrome.storage.local.get('token')
  if (!token) { mostrarErro('Cole seu token JWT nas configurações.'); return }
  let leads = leadsBusca
  if (apenasChecados) {
    const checkboxes = document.querySelectorAll('.lead-checkbox:checked')
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index))
    leads = indices.map(i => leadsBusca[i])
  }
  if (leads.length === 0) { alert('Nenhum lead selecionado.'); return }
  els.bulkProgress.style.display = 'block'
  els.bulkProgress.textContent = `Enviando ${leads.length} leads...`
  els.btnCaptureAll.disabled = true
  els.btnCaptureSelected.disabled = true
  let res;
  try {
    res = await fetch(`${API_URL}/api/leads/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        leads, 
        group_name: els.groupNameBulk.value || 'sem_grupo',
        campaign_id: els.campaignIdBulk.value || null
      })
    })
    const data = await res.json()
    if (res.ok) {
      els.bulkProgress.style.display = 'none'
      els.bulkResult.style.display = 'block'
      els.bulkResult.style.color = '#00c896'
      els.bulkResult.textContent = `✅ ${data.leads.length} leads capturados!`
      await notificarVendedor(token, data.leads)
      // Reset UI after successful capture
      leadsBusca = []
      els.listaLeads.innerHTML = ''
      els.totalEncontrado.textContent = 'Nenhum lead selecionado.'
    } else { throw new Error(data.error) }
  } catch (err) {
    console.error('Erro na captura em massa:', err);
    els.bulkProgress.style.display = 'none'
    els.bulkResult.style.display = 'block'
    els.bulkResult.style.color = '#ff3b5c'
    els.bulkResult.textContent = '❌ Erro: ' + err.message
  } finally {
    els.btnCaptureAll.disabled = false
    els.btnCaptureSelected.disabled = false
  }
}

async function notificarVendedor(token, leads) {
  try {
    const graus = { '1': [], '2': [], '3': [] }
    leads.forEach(l => { const g = l.connection_degree || '3'; graus[g].push(l.name) })
    const resumo = `🔔 *LinkedIn Prospector — Cromosit IT*\n\n*${leads.length} novos leads capturados!*\n\n` +
      (graus['1'].length ? `🟢 *1º Grau (${graus['1'].length}):*\n${graus['1'].slice(0,5).join(', ')}\n\n` : '') +
      (graus['2'].length ? `🔵 *2º Grau (${graus['2'].length}):*\n${graus['2'].slice(0,5).join(', ')}\n\n` : '') +
      (graus['3'].length ? `⚪ *3º Grau (${graus['3'].length}):*\n${graus['3'].slice(0,5).join(', ')}\n\n` : '') +
      `Acesse: https://prospector.cromosit.com/leads`
    await fetch(`${API_URL}/api/notificar-vendedor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ mensagem: resumo })
    })
  } catch (e) { console.warn('Notificação não enviada:', e) }
}

els.btnCapture?.addEventListener('click', async () => {
  const { token } = await chrome.storage.local.get('token')
  if (!token) { mostrarErro('🔐 Faça login ou cole seu token nas configurações.'); return }

  // SE O PERFIL ESTIVER VAZIO, TENTA LER DE NOVO NA HORA DO CLIQUE
  if (!perfilAtual || !perfilAtual.name) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    setCarregando(true);
    els.btnCaptureText.textContent = '⏳ Lendo LinkedIn...';
    
    chrome.tabs.sendMessage(tab.id, { action: 'extrairPerfil' }, (response) => {
      if (response?.dados?.name) {
        perfilAtual = response.dados;
        executarSalvamentoIndividual(token);
      } else {
        setCarregando(false);
        els.btnCaptureText.textContent = '+ Capturar Lead';
        mostrarErro('❌ Não foi possível ler os dados. Tente dar F5 na página!');
      }
    });
    return;
  }

  executarSalvamentoIndividual(token);
});

async function executarSalvamentoIndividual(token) {
  setCarregando(true); esconderMensagens();
  els.btnCaptureText.textContent = 'Salvando...';

  try {
    const { exists, lead } = await verificarLeadExiste(perfilAtual.linkedin_id);
    
    // FILTRO INTELIGENTE: Só envia campos que não estão vazios para não apagar o que já existe no CRM
    const dadosParaEnviar = { ...perfilAtual };
    Object.keys(dadosParaEnviar).forEach(key => {
      if (!dadosParaEnviar[key] || dadosParaEnviar[key] === '' || dadosParaEnviar[key] === 'null') {
        delete dadosParaEnviar[key];
      }
    });

    let res;
    let isUpdate = false;

    if (exists && lead?.id) {
      isUpdate = true;
      res = await fetch(`${API_URL}/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          ...dadosParaEnviar,
          temperature: els.temperature.value, 
          notes: els.notes.value,
          group_name: els.groupName.value || 'Geral',
          campaign_id: els.campaignId.value || null
        })
      });
    } else {
      res = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          ...dadosParaEnviar, 
          temperature: els.temperature.value, 
          notes: els.notes.value, 
          group_name: els.groupName.value || 'Geral',
          campaign_id: els.campaignId.value || null,
          source: 'chrome_extension' 
        })
      });
    }

    const data = await res.json()
    if (res.ok) {
      leadIdCapturado = data.lead.id
      mostrarSucesso(isUpdate ? `✅ Dados atualizados no CRM!` : `✅ ${perfilAtual.name} capturado!`)
      els.btnCapture.style.display = 'none'
      els.btnAI.style.display = 'block'
    } else { 
      // SE O ERRO FOR DE DUPLICIDADE (ID ou URL), TRATA COMO SUCESSO (LEAD JÁ EXISTENTE)
      const msgErro = (data.message || data.error || '').toLowerCase();
      const isDuplicado = msgErro.includes('unique constraint') || 
                          msgErro.includes('already exists') || 
                          msgErro.includes('duplicate key') ||
                          res.status === 409;

      if (isDuplicado) {
        mostrarSucesso(`✅ Este lead já está no seu CRM!`)
        // Tenta recuperar o ID se o backend enviou
        if (data.lead?.id) leadIdCapturado = data.lead.id
        
        els.btnCapture.style.display = 'none'
        els.btnAI.style.display = 'block'
        // Se já tiver mensagem, mostra os botões de envio
        if (els.msgText.textContent) {
          els.btnWhatsApp.style.display = 'block'
          if (perfilAtual?.connection_degree === '1') els.btnLinkedInMsg.style.display = 'block'
        }
      } else {
        throw new Error(data.error || data.message || 'Erro ao capturar.') 
      }
    }
  } catch (err) { 
    console.error('Erro na captura:', err);
    mostrarErro(err.message || 'Erro de conexão com o backend.') 
  } finally { 
    setCarregando(false);
    els.btnCaptureText.textContent = '+ Capturar Lead';
  }
}

els.btnAI?.addEventListener('click', async () => {
  if (!leadIdCapturado) return
  const { token } = await chrome.storage.local.get('token')
  els.btnAI.textContent = '⟳ Gerando...'; els.btnAI.disabled = true
  try {
    const res = await fetch(`${API_URL}/api/leads/${leadIdCapturado}/gerar-mensagem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ tipo: perfilAtual?.connection_degree === '1' ? 'primeiro_contato' : perfilAtual?.connection_degree === '2' ? 'conexao_com_comum' : 'conexao' })
    })
    const data = await res.json()
    if (res.ok) {
      els.msgText.textContent = data.mensagem
      els.msgBox.classList.add('visible')
      els.btnWhatsApp.style.display = 'block'
      // Mostra botão LinkedIn apenas para 1º grau (está conectado)
      if (perfilAtual?.connection_degree === '1') {
        els.btnLinkedInMsg.style.display = 'block'
      }
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

els.btnWhatsApp?.addEventListener('click', async () => {
  const msg = els.msgText.textContent
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  async function abrirWpp(phone) {
    let cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
    chrome.tabs.create({ url })
  }

  if (!perfilAtual?.phone) {
    els.btnWhatsApp.textContent = '⏳ Buscando no banco...';
    
    // Tenta primeiro extrair da página
    chrome.tabs.sendMessage(tab.id, { action: 'extrairCompleto' }, async (response) => {
      if (response?.dados?.phone) {
        perfilAtual.phone = response.dados.phone;
        els.btnWhatsApp.textContent = '📱 Enviar via WhatsApp';
        abrirWpp(response.dados.phone);
      } else {
        // Se falhar na página, tenta buscar no banco de dados pelo ID do lead
        try {
          const { token } = await chrome.storage.local.get('token');
          const res = await fetch(`${API_URL}/api/leads/check/${perfilAtual.linkedin_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          
          if (data.exists && data.lead?.phone) {
            perfilAtual.phone = data.lead.phone;
            els.btnWhatsApp.textContent = '📱 Enviar via WhatsApp';
            abrirWpp(data.lead.phone);
          } else {
            els.btnWhatsApp.textContent = '📱 Enviar via WhatsApp';
            mostrarErro('❌ Não encontramos o telefone nem na página, nem no seu CRM.');
          }
        } catch (e) {
          els.btnWhatsApp.textContent = '📱 Enviar via WhatsApp';
          mostrarErro('❌ Erro ao consultar o banco de dados.');
        }
      }
    });
    return;
  }

  abrirWpp(perfilAtual.phone);
})

// ==========================================
// ENVIAR NO INBOX DO LINKEDIN
// ==========================================
els.btnLinkedInMsg?.addEventListener('click', async () => {
  const mensagem = els.msgText.textContent
  if (!mensagem) return
  els.btnLinkedInMsg.textContent = '⟳ Abrindo chat...'
  els.btnLinkedInMsg.disabled = true
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.tabs.sendMessage(tab.id, { action: 'enviarMensagemLinkedIn', texto: mensagem }, (response) => {
    if (response && response.sucesso) {
      chrome.storage.local.get('token', ({ token }) => {
        // 1. Registra atividade
        fetch(`${API_URL}/api/leads/${leadIdCapturado}/atividades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ type: 'linkedin_msg_enviada', description: `Mensagem enviada no LinkedIn: "${mensagem.substring(0, 100)}..."` })
        })
        
        // 2. Atualiza Status e Agenda Follow-up
        const proximo = new Date(); proximo.setDate(proximo.getDate() + 3);
        fetch(`${API_URL}/api/leads/${leadIdCapturado}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            status: 'contatado', 
            contacted_at: new Date().toISOString(),
            next_followup_at: proximo.toISOString()
          })
        })
      })
    } else {
      mostrarErro(response?.erro || 'Não foi possível abrir o chat. Verifique se está no perfil do lead.')
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

// 🤝 LÓGICA DO BOTÃO DE CONEXÃO
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
    window.close() // Fecha o popup para deixar o robô agir
  } else {
    alert('Escolha uma campanha com template de mensagem para usar o convite automático!')
  }
})
