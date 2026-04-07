// background.js — CROMOSIT IT DEV V1.0 (portado do v5.8.3)
// Aponta para localhost:3000 em vez de Railway
const API_URL = 'http://localhost:3000';

// Keep-alive do Service Worker
function keepAlive() { console.track = (console.track || 0) + 1; }
setInterval(keepAlive, 20000);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // 1. SINCRONIZAR TOKEN (vindo do app_bridge.js ou CRM local)
  if (message.type === 'SET_TOKEN' && message.token) {
    chrome.storage.local.set({ token: message.token }, () => {
      console.log('[DEV V1] ✅ TOKEN SINCRONIZADO — localhost:3000');
      sendResponse({ success: true });
    });
    return true;
  }

  // Compatibilidade com app_bridge.js antigo (action: setToken)
  if (message.action === 'setToken' && message.token) {
    chrome.storage.local.set({ token: message.token }, () => {
      console.log('[DEV V1] ✅ Token (action:setToken) sincronizado');
      sendResponse({ sucesso: true });
    });
    return true;
  }

  // 2. PROXY DE API — todas as chamadas via background (evita CSP do LinkedIn)
  if (message.action === 'apiRequest') {
    const { method = 'POST', path, body } = message;
    chrome.storage.local.get(['token'], async ({ token }) => {
      try {
        const res = await fetch(`${API_URL}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: body ? JSON.stringify(body) : undefined
        });
        const data = await res.json();
        sendResponse({ sucesso: res.ok, data, status: res.status });
      } catch (err) {
        console.error('[DEV V1] Erro na API:', err.message);
        sendResponse({ sucesso: false, erro: 'Backend offline? Rode o .bat primeiro.' });
      }
    });
    return true;
  }

  // 3. SALVAR LEAD INDIVIDUAL (via apiRequest direto)
  if (message.action === 'save_lead') {
    chrome.storage.local.get(['token'], async ({ token }) => {
      try {
        const res = await fetch(`${API_URL}/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(message.lead)
        });
        const data = await res.json();
        console.log('[DEV V1] ✅ Lead salvo:', data?.name || data?.id);
        sendResponse({ sucesso: res.ok, lead: data });
      } catch (err) {
        sendResponse({ sucesso: false, erro: err.message });
      }
    });
    return true;
  }

  // 4. SALVAR EM MASSA (rota pública /leads/bulk)
  if (message.action === 'save_bulk') {
    fetch(`${API_URL}/leads/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: message.leads })
    })
    .then(res => res.json())
    .then(data => {
      console.log(`[DEV V1] ✅ ${data.leads?.length || 0} leads salvos em massa!`);
      sendResponse({ sucesso: true, data });
    })
    .catch(err => {
      console.error('[DEV V1] Erro bulk:', err.message);
      sendResponse({ sucesso: false, erro: err.message });
    });
    return true;
  }
});
