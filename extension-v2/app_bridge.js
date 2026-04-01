// app_bridge.js — v2.0
(function () {
  const token = localStorage.getItem('token');
  if (token) {
    chrome.runtime.sendMessage({ type: 'SET_TOKEN', token }, (response) => {
      // Ignora erro se extensão v2 não instalada
      if (chrome.runtime.lastError) return;
      if (response?.success) {
        console.log('[v2] ✅ Token sincronizado do App');
      }
    });
  }
})();
