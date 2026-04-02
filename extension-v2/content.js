// content.js — v2.0
// Abordagem: Texto Bruto + Espera Inteligente (Smart Wait)

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = 'rgba(29, 143, 232, 0.95)') {
  const old = document.getElementById('lp-banner-v2');
  if (old) old.remove();
  
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v2';
  
  // Design Glassmorphism Premium
  banner.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 2147483647;
    padding: 18px 24px;
    background: ${cor};
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    max-width: 360px;
    white-space: pre-wrap;
    line-height: 1.5;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    transform: translateX(120%);
    opacity: 0;
  `;

  // HTML estruturado para o Banner
  const title = "💎 LP PROSPECTOR PRO";
  banner.innerHTML = `<div style="font-weight: 800; font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; opacity: 0.9; text-transform: uppercase;">${title}</div><div>${texto}</div>`;
  
  document.body.appendChild(banner);

  // Animação de Entrada
  requestAnimationFrame(() => {
    banner.style.transform = 'translateX(0)';
    banner.style.opacity = '1';
  });

  // Auto-remove com animação de saída
  setTimeout(() => {
    banner.style.transform = 'translateX(120%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 500);
  }, 8000);
}

function normalizarTelefone(phone) {
  if (!phone) return null;
  // Remove tudo que não é número ou sinal de +
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  
  // Se já tem +, mantemos como internacional
  if (cleaned.startsWith('+')) return cleaned;
  
  // Se não tem +, mas parece ser um número longo (DDI + DDD + Num)
  if (cleaned.length >= 11) return '+' + cleaned;
  
  // Fallback para Brasil se for curto (8 ou 9 dígitos + DDD)
  if (cleaned.length === 10 || cleaned.length === 11) return '+55' + cleaned;
  
  return cleaned;
}

function extrairDadosDoTexto(root) {
  const dados = {};
  if (!root) return dados;
  const rawText = root.innerText || '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  const lowerLines = lines.map(l => l.toLowerCase());

  // E-mail (Regex mais abrangente)
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) dados.email = emailMatch[0];

  // Telefone - Busca mais inteligente
  const phoneLabels = ['telefone', 'phone', 'celular', 'mobile', 'tel'];
  const phoneIdx = lowerLines.findIndex(l => phoneLabels.some(label => l.includes(label)));
  if (phoneIdx !== -1 && lines[phoneIdx + 1]) {
    // Verifica se a próxima linha contém números (evita pegar outro label)
    if (/[0-9]/.test(lines[phoneIdx + 1])) {
      dados.phone = normalizarTelefone(lines[phoneIdx + 1]);
    }
  }

  // Aniversário
  const bdLabels = ['aniversário', 'birthday', 'nascimento'];
  const bdIdx = lowerLines.findIndex(l => bdLabels.some(label => l.includes(label)));
  if (bdIdx !== -1 && lines[bdIdx + 1]) {
    dados.birthday = lines[bdIdx + 1];
  }

  // Conectado desde
  const connLabels = ['conexão desde', 'connected', 'membro desde', 'connection'];
  const connIdx = lowerLines.findIndex(l => connLabels.some(label => l.includes(label)));
  if (connIdx !== -1 && lines[connIdx + 1]) {
    dados.connected_since = lines[connIdx + 1];
  }

  return dados;
}

async function extrairExperiencia() {
  window.scrollTo(0, 500); await esperar(500);
  window.scrollTo(0, 1000); await esperar(500);
  const expSection = document.querySelector('#experience')?.parentElement;
  if (!expSection) return { role: '', company: '' };
  
  const firstExp = expSection.querySelector('li');
  const texts = Array.from(firstExp?.querySelectorAll('span[aria-hidden="true"]') || [])
    .map(el => el.innerText.trim())
    .filter(t => t.length > 2);
    
  return {
    role: texts[0] || '',
    company: (texts[1] || '').split('·')[0].trim()
  };
}

async function iniciarCaptura(leadId) {
  exibirBanner('⏳ Iniciando captura robusta...');
  const finalDados = {};

  // 1. Captura do Modal (Aumentado para 10 tentativas de 1s)
  for (let i = 0; i < 10; i++) {
    const modal = document.querySelector('.artdeco-modal__content, .pv-contact-info');
    if (modal) {
      const modalDados = extrairDadosDoTexto(modal);
      Object.assign(finalDados, modalDados);
      
      // Só encerra se pegou os dois, ou se já tentou bastante
      if (modalDados.email && modalDados.phone) break;
    }
    await esperar(1000);
  }

  // 2. Localização do Header
  const locEl = document.querySelector('.pv-text-details__left-panel span.text-body-small') || 
                document.querySelector('.pv-top-card--list li:last-child');
  if (locEl) finalDados.location = locEl.innerText.trim();

  // 3. Experiência
  const { role, company } = await extrairExperiencia();
  finalDados.current_role = role;
  finalDados.current_company = company;

  // Envio
  chrome.runtime.sendMessage(
    { action: 'apiRequest', method: 'PUT', path: `/api/leads/${leadId}`, body: finalDados },
    (res) => {
      if (res?.sucesso) {
        exibirBanner(`✨ Captura concluída!\n<b>${finalDados.current_role}</b> @ ${finalDados.current_company}\n📞 Tel: ${finalDados.phone || 'N/A'}`, 'rgba(0, 200, 150, 0.9)');
      } else {
        exibirBanner(`❌ Falha no Sincronismo\n${res?.erro || 'Erro de conexão'}`, 'rgba(255, 59, 92, 0.9)');
      }
    }
  );
}

// Escuta a URL para disparar a ação
const p = new URLSearchParams(window.location.search);
if (p.get('lp_action') === 'capture_contacts' && p.get('lp_lead_id')) {
  iniciarCaptura(p.get('lp_lead_id'));
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (event.data?.type === 'LP_PROSPECTOR_TOKEN' && event.data?.token) {
    chrome.storage.local.set({ token: event.data.token })
  }
})
