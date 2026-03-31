// background.js — Service Worker da extensão
// Gerencia token e proxy de chamadas de API (CSP do LinkedIn bloqueia fetch direto)

const API_URL = 'https://linkedin-prospector-production.up.railway.app'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Sincroniza token da web app
  if (message.type === 'SET_TOKEN' && message.token) {
    chrome.storage.local.set({ token: message.token }, () => {
      console.log('✅ Token sincronizado automaticamente do app')
      sendResponse({ success: true })
    })
    return true
  }

  // PROXY de API — content scripts não podem fazer fetch externo (CSP do LinkedIn)
  // Todas as chamadas ao backend passam pelo background
  if (message.action === 'apiRequest') {
    const { method = 'PUT', path, body } = message
    chrome.storage.local.get(['token'], async ({ token }) => {
      try {
        const res = await fetch(`${API_URL}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: body ? JSON.stringify(body) : undefined
        })
        const data = await res.json()
        sendResponse({ sucesso: res.ok, data, status: res.status })
      } catch (err) {
        sendResponse({ sucesso: false, erro: err.message })
      }
    })
    return true // mantém canal aberto para resposta assíncrona
  }
})
