const CRM_URL = 'https://prospector.cromosit.com'

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btnAbrirCRM').addEventListener('click', () => {
    chrome.tabs.create({ url: CRM_URL })
  })
  verificarAutenticacao()
})

async function verificarAutenticacao() {
  const statusEl = document.getElementById('syncStatus')
  try {
    const { token } = await chrome.storage.local.get('token')
    if (!token) {
      statusEl.className = 'status error'
      statusEl.textContent = '⚠️ Não autenticado — clique em Abrir CRM e faça login'
      return
    }
    const res = await fetch(`${CRM_URL}/api/leads/stats/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      statusEl.className = 'status'
      statusEl.textContent = '✅ Autenticado — pronto para capturar'
    } else {
      statusEl.className = 'status error'
      statusEl.textContent = '⚠️ Token expirado — faça login novamente'
      await chrome.storage.local.remove('token')
    }
  } catch {
    statusEl.className = 'status error'
    statusEl.textContent = '⚠️ Sem conexão com o CRM'
  }
}
