// content.js — v2.0
// Abordagem: Texto Bruto + Espera Inteligente (Smart Wait)

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v2');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v2';
  banner.style.cssText = `position:fixed;top:20px;right:20px;z-index:999999;padding:14px 20px;background:${cor};color:white;font-family:sans-serif;font-size:13px;font-weight:600;border-radius:6px;box-shadow:0 6px 30px rgba(0,0,0,0.4);max-width:380px;white-space:pre-wrap;line-height:1.4;`;
  banner.innerText = '🚀 LP Prospector v2.0\n' + texto;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 7000);
}

function normalizarTelefone(phone, location = '') {
  if (!phone) return null;
  const nums = phone.replace(/\D/g, '');
  if (nums.length < 8) return null;
  if (nums.startsWith('55') && nums.length >= 12) return '+' + nums;
  if (nums.length >= 10) return '+55' + nums;
  return '+55' + nums; // Fallback simples
}

function extrairDadosDoTexto(root) {
  const dados = {};
  if (!root) return dados;
  const rawText = root.innerText || '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  const lowerLines = lines.map(l => l.toLowerCase());

  // E-mail (Regex)
  const emailMatch = rawText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) dados.email = emailMatch[1];

  // Telefone (Busca por título e próxima linha)
  const phoneIdx = lowerLines.findIndex(l => l === 'telefone' || l === 'phone' || l.includes('celular'));
  if (phoneIdx !== -1 && lines[phoneIdx + 1]) {
    dados.phone = normalizarTelefone(lines[phoneIdx + 1]);
  }

  // Aniversário
  const bdIdx = lowerLines.findIndex(l => l.includes('aniversário') || l.includes('birthday') || l.includes('nascimento'));
  if (bdIdx !== -1 && lines[bdIdx + 1]) {
    dados.birthday = lines[bdIdx + 1];
  }

  // Conectado desde
  const connIdx = lowerLines.findIndex(l => l.includes('conexão desde') || l.includes('connected') || l.includes('membro desde'));
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

  // 1. Captura do Modal (se aberto pela URL)
  for (let i = 0; i < 5; i++) {
    const modal = document.querySelector('.artdeco-modal__content, .pv-contact-info');
    if (modal) {
      const modalDados = extrairDadosDoTexto(modal);
      Object.assign(finalDados, modalDados);
      if (modalDados.email || modalDados.phone) break;
    }
    await esperar(1000); // Tenta 5 vezes esperar os dados aparecerem
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
        exibirBanner(`✅ Captura concluída!\n${finalDados.current_role} @ ${finalDados.current_company}\nTel: ${finalDados.phone || 'N/A'}`, '#00c896');
      } else {
        exibirBanner(`❌ Erro no envio: ${res?.erro || 'falha'}`, '#ff3b5c');
      }
    }
  );
}

// Escuta a URL para disparar a ação
const p = new URLSearchParams(window.location.search);
if (p.get('lp_action') === 'capture_contacts' && p.get('lp_lead_id')) {
  iniciarCaptura(p.get('lp_lead_id'));
}
