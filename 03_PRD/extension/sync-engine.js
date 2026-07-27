// sync-engine.js — DEV V1.0 (portado do Cromosit Shield v1.0)
// Aceita mensagens de localhost em vez de cromosit.com

const SyncEngine = {
  initSync: () => {
    window.addEventListener('message', (event) => {
      // DEV: aceita apenas mensagens de localhost
      if (!event.origin.includes('localhost')) return;

      if (event.data?.type === 'CROMOSIT_AUTH_PULSE') {
        const token = event.data.token;
        chrome.runtime.sendMessage({ type: 'SET_TOKEN', token }, () => {
          if (chrome.runtime.lastError) return;
          console.log('[DEV Shield] ✅ Token sincronizado via Pulso Auth (localhost)');
        });
      }
    });

    // Keep-alive do service worker com tratamento de erro
    setInterval(() => {
      try {
        chrome.runtime.sendMessage({ type: 'CHECK_ALIVE' }, () => {
          if (chrome.runtime.lastError) {
             // Ignora silenciosamente erros de desconexão ('Extension context invalidated', etc)
             return;
          }
        });
      } catch (e) {
        // Captura síncrono, caso o contexto tenha sido destruído
      }
    }, 60000);
  }
};

SyncEngine.initSync();
