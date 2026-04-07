// popup.js — DEV V1.0 (portado do v2.0)
// CSP compliant: sem inline handlers

const CRM_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {

  // Botão: Abrir CRM local
  document.getElementById('btnAbrirCRM').addEventListener('click', () => {
    chrome.tabs.create({ url: CRM_URL });
  });

  // Botão: Capturar busca atual
  document.getElementById('btnCapturarBusca').addEventListener('click', async () => {
    const statusEl = document.getElementById('syncStatus');
    statusEl.className = 'status';
    statusEl.textContent = '⟳ Capturando busca...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';

    if (!url.includes('linkedin.com')) {
      statusEl.className = 'status error';
      statusEl.textContent = '⚠️ Abra o LinkedIn primeiro';
      return;
    }

    const isBusca = url.includes('/search/') || url.includes('keywords=');
    const isPerfil = url.match(/linkedin\.com\/in\/[^/?]+/);

    if (!isBusca && !isPerfil) {
      statusEl.className = 'status error';
      statusEl.textContent = '⚠️ Vá para uma busca ou perfil do LinkedIn';
      return;
    }

    const action = isBusca ? 'capturar_busca' : 'capturar_perfil';

    // Injeta o content script se necessário (tab já aberta)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['sync-engine.js', 'content.js']
      }).catch(() => {});
    } catch (e) {}

    chrome.tabs.sendMessage(tab.id, { action }, (response) => {
      if (chrome.runtime.lastError) {
        statusEl.className = 'status error';
        statusEl.textContent = '❌ Dê F5 no LinkedIn e tente novamente';
        return;
      }
      if (response?.success) {
        statusEl.className = 'status';
        statusEl.textContent = `✅ ${response.message}`;
      } else {
        statusEl.className = 'status error';
        statusEl.textContent = `❌ ${response?.error || 'Erro desconhecido'}`;
      }
    });
  });

  // Verificar autenticação ao abrir popup
  verificarAutenticacao();
});

async function verificarAutenticacao() {
  const statusEl = document.getElementById('syncStatus');
  try {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
      statusEl.className = 'status error';
      statusEl.textContent = '⚠️ Não autenticado — Abra o CRM e faça login';
      return;
    }

    const res = await fetch(`${API_URL}/leads?limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      statusEl.className = 'status';
      statusEl.textContent = '✅ Conectado ao backend DEV (localhost:3000)';
    } else if (res.status === 401) {
      statusEl.className = 'status error';
      statusEl.textContent = '⚠️ Token expirado — faça login novamente';
      await chrome.storage.local.remove('token');
    } else {
      statusEl.className = 'status error';
      statusEl.textContent = `⚠️ Backend retornou ${res.status}`;
    }
  } catch (err) {
    statusEl.className = 'status error';
    statusEl.textContent = '❌ Backend offline — rode o .bat primeiro';
  }
}
