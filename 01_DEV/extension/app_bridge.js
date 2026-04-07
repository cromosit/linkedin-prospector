// app_bridge.js — DEV V1.0
// Roda em localhost:5173 e sincroniza o token JWT com a extensão
(function () {
  function sincronizar() {
    const token = localStorage.getItem('token');
    if (token && token.length > 50) {
      // Tenta o formato v2 (SET_TOKEN)
      chrome.runtime.sendMessage({ type: 'SET_TOKEN', token }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response?.success) console.log('[DEV Bridge] ✅ Token sincronizado (SET_TOKEN)');
      });
      // Compatibilidade com formato antigo (setToken)
      chrome.runtime.sendMessage({ action: 'setToken', token }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response?.sucesso) console.log('[DEV Bridge] ✅ Token sincronizado (setToken)');
      });
    }
  }

  // Sincroniza ao carregar e a cada 5 segundos
  setTimeout(sincronizar, 1000);
  setInterval(sincronizar, 5000);

  // Sincroniza quando o localStorage muda (ex: após login)
  window.addEventListener('storage', (event) => {
    if (event.key === 'token') sincronizar();
  });
})();
