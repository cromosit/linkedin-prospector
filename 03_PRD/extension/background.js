// background.js — MOTOR DE SINCRONIZAÇÃO v3.8.5 MASTER — CROMOSIT IT
const API_URL = 'https://linkedin-prospector-production.up.railway.app/api';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'save_lead') {
    console.log('[Background] Iniciando salvamento do lead:', request.lead.name);

    fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.lead)
    })
    .then(async (response) => {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (response.ok) {
           console.log('[Background] Lead salvo com sucesso:', data);
           sendResponse({ success: true, data });
        } else {
           console.error('[Background] Erro na API:', data);
           sendResponse({ success: false, error: data.message || 'Erro no servidor' });
        }
      } catch (e) {
        console.error('[Background] Resposta malformada:', text);
        sendResponse({ success: false, error: 'Resposta do servidor não é um JSON válido.' });
      }
    })
    .catch(err => {
      console.error('[Background] Erro de rede:', err);
      sendResponse({ success: false, error: 'Falha na conexão com o servidor.' });
    });

    return true; // Mantém o canal aberto para resposta assíncrona
  }
});
