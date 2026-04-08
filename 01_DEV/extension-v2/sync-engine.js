// sync-engine.js — Cromosit Shield v1.0 [O Cérebro da Sincronia]
const SyncEngine = {
  // 1. SINCRONIA DE LOGIN (BROADCAST)
  initSync: () => {
    window.addEventListener('message', (event) => {
      // Aceita apenas mensagens de domínios seguros da Cromosit
      if (!event.origin.includes('cromosit.com') && !event.origin.includes('railway.app')) return;
      
      if (event.data?.type === 'CROMOSIT_AUTH_PULSE') {
        const token = event.data.token;
        chrome.runtime.sendMessage({ type: 'SET_TOKEN', token }, (response) => {
          console.log('🛡️ SHIELD: Token Sincronizado via Pulso Auth');
        });
      }
    });

    // Envia pulso de vida a cada 60 segundos
    setInterval(() => {
      chrome.runtime.sendMessage({ type: 'CHECK_ALIVE' });
    }, 60000);
  },

  // 2. AUTO-CURA DE VERSÃO
  checkVersion: async (currentVersion) => {
    try {
      const res = await fetch('https://linkedin-prospector-production.up.railway.app/api/status/version');
      const { requiredVersion } = await res.json();
      if (requiredVersion !== currentVersion) {
        console.warn('🛡️ SHIELD: Versão desatualizada detectada. Forçando recarregamento...');
        chrome.runtime.reload();
      }
    } catch (e) { /* Silencioso em caso de offline */ }
  }
};
