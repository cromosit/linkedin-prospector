// background.js — v2.0
const API_URL = 'https://prospector.cromosit.com'; // Endereço de produção unificado

// Sincronização de Token e Chamadas de Proxy
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_TOKEN' && message.token) {
    chrome.storage.local.set({ token: message.token }, () => {
      console.log('[v2] ✅ Token sincronizado');
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'apiRequest') {
    const { method = 'PUT', path, body } = message;
    chrome.storage.local.get(['token'], async ({ token }) => {
      if (!token) {
        sendResponse({ sucesso: false, erro: 'Token não encontrado. Faça login no app.' });
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
        sendResponse({ sucesso: false, erro: 'Erro de conexão: ' + err.message });
      }
    });
    return true;
  }
});
