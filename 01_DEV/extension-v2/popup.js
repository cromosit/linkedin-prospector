// popup.js — LinkedIn Prospector v2.0 — Cromosit IT
// CSP compliant: sem inline handlers

const CRM_URL = 'https://prospector.cromosit.com'

document.addEventListener('DOMContentLoaded', async () => {
  // Botão abrir CRM — sem inline onclick (CSP MV3)
  document.getElementById('btnAbrirCRM').addEventListener('click', () => {
    chrome.tabs.create({ url: CRM_URL })
  })

  verificarAutenticacao()
})

async function verificarAutenticacao() {
  const statusEl = document.getElementById('syncStatus')

  try {
    // Tenta pegar token do Chrome Storage (salvo pelo CRM de produção)
    const { token } = await chrome.storage.local.get('token')

    if (!token) {
      statusEl.className = 'status error'
      statusEl.textContent = '⚠️ Não autenticado — clique em "Abrir CRM" e faça login'
      return
    }

    // Verifica se o token ainda é válido
    const res = await fetch(`${CRM_URL}/api/leads/stats/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (res.ok) {
      statusEl.className = 'status'
      statusEl.textContent = '✅ Autenticado — pronto para capturar leads'
    } else if (res.status === 401) {
      statusEl.className = 'status error'
      statusEl.textContent = '⚠️ Token expirado — faça login novamente no CRM'
      await chrome.storage.local.remove('token')
    } else {
      statusEl.className = 'status error'
      statusEl.textContent = `⚠️ API retornou erro ${res.status}`
    }
  } catch (err) {
    statusEl.className = 'status error'
    statusEl.textContent = '⚠️ Sem conexão com o CRM'
  }
}
