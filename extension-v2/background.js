// background.js — v5.8.3 [PERSISTENT WORKER]
const API_URL = 'https://linkedin-prospector-production.up.railway.app';

// 🏛️ SKILL: KEEP-ALIVE SYSTEM (Autocura v5.8)
// Impede que o Service Worker fique 'inativo' enviando um sinal interno
function keepAlive() { console.track = (console.track || 0) + 1; }
setInterval(keepAlive, 20000);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Sincronização de Login Direto (Multi-Domínio)
  if (message.type === 'SET_TOKEN' && message.token) {
    chrome.storage.local.set({ token: message.token }, () => {
      console.log('[v5.8] ✅ TOKEN DE ELITE SINCRONIZADO');
      sendResponse({ success: true });
    });
    return true;
  }

  // Proxy de API Seguro com Wake-up call
  if (message.action === 'apiRequest') {
    const { method = 'PUT', path, body } = message;
    chrome.storage.local.get(['token'], async ({ token }) => {
      if (!token) {
        sendResponse({ sucesso: false, erro: 'LOGIN_REQUIRED' });
        return;
      }
      try {
        const res = await fetch(`${API_URL}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: body ? JSON.stringify(body) : undefined
        });
        const data = await res.json();
        sendResponse({ sucesso: res.ok, data, status: res.status });
      } catch (err) {
        sendResponse({ sucesso: false, erro: 'Conexão Offline' });
      }
    });
    return true;
  }
});
