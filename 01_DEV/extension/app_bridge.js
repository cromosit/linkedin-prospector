// app_bridge.js — Content script que roda em prospector.cromosit.com
// Lê o token do localStorage e envia para o background da extensão automaticamente

(function () {
  let lastToken = null;

  function syncToken() {
    const token = localStorage.getItem('token');
    if (token && token !== lastToken) {
      chrome.runtime.sendMessage({ type: 'SET_TOKEN', token }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response?.success) {
          console.log('[LinkedIn Prospector] ✅ Token sincronizado com a extensão');
          lastToken = token;
        }
      });
    }
  }

  syncToken();
  setInterval(syncToken, 2000);
})();
