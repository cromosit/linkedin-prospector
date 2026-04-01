// popup.js — v2.0
// Verifica se a extensão v2.0 tem o token sincronizado

document.addEventListener('DOMContentLoaded', async () => {
  const syncStatus = document.getElementById('syncStatus');
  const errorMsg = document.getElementById('errorMsg');
  
  chrome.storage.local.get(['token'], (res) => {
    if (res.token) {
      syncStatus.textContent = '✅ Sincronizado com o App — CRM';
      syncStatus.style.background = 'rgba(0,200,150,0.1)';
      syncStatus.style.color = '#00c896';
      errorMsg.style.display = 'none';
    } else {
      syncStatus.textContent = '⚠️ Não autenticado — faça login no CRM';
      syncStatus.style.background = 'rgba(255,107,53,0.1)';
      syncStatus.style.color = '#ff6b35';
      errorMsg.textContent = 'O CRM deve estar aberto para sincronizar.';
      errorMsg.style.display = 'block';
    }
  });

  // Verifica saúde da API (opcional)
  try {
    const res = await fetch('https://linkedin-prospector-production.up.railway.app/health');
    if (!res.ok) throw new Error();
  } catch (e) {
    errorMsg.textContent = '❌ Backend (Railway) offline. Verifique o servidor.';
    errorMsg.style.display = 'block';
  }
});
