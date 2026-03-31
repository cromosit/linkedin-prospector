// background.js — Service Worker da extensão
// Recebe o token da web app e armazena automaticamente

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_TOKEN' && message.token) {
    chrome.storage.local.set({ token: message.token }, () => {
      console.log('✅ Token sincronizado automaticamente do app');
      sendResponse({ success: true });
    });
    return true; // mantém canal aberto para resposta assíncrona
  }
});
