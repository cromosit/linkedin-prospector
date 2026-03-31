// app_bridge.js — Content script que roda em prospector.cromosit.com
// Lê o token do localStorage e envia para o background da extensão automaticamente

(function () {
  const token = localStorage.getItem('token');
  if (token) {
    chrome.runtime.sendMessage({ type: 'SET_TOKEN', token }, (response) => {
      if (chrome.runtime.lastError) return; // extensão pode não estar instalada
      if (response?.success) {
        console.log('[LinkedIn Prospector] ✅ Token sincronizado com a extensão');
      }
    });
  }
})();
