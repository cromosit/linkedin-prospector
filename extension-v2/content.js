// content.js — LinkedIn Prospector v2.0 — LIMPO

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

function normalizarTelefone(phone) {
  if (!phone) return null;
  const nums = phone.replace(/\D/g, '');
  if (nums.length < 8) return null;
  if (nums.startsWith('55') && nums.length >= 12) return '+' + nums;
  return '+55' + nums;
}

// Extrai dados de qualquer container usando texto bruto
function extrairDadosDoTexto(root) {
  const dados = {};
  if (!root) return dados;
  const rawText = root.innerText || '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lowerLines = lines.map(l => l.toLowerCase());

  // Email via regex
  const emailMatch = rawText.match(/([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) dados.email = emailMatch[1];

  // Telefone — busca linha após "telefone" ou "phone" ou "celular"
  for (let i = 0; i < lowerLines.length; i++) {
    if (lowerLines[i] === 'telefone' || lowerLines[i] === 'phone' || lowerLines[i].includes('celular') || lowerLines[i].includes('mobile')) {
      const next = lines[i + 1] || '';
      const tel = normalizarTelefone(next);
      if (tel) { dados.phone = tel; break; }
    }
  }

  // Fallback telefone via regex
  if (!dados.phone) {
    const telMatch = rawText.match(/(\+?[\d\s\-().]{10,20})/);
    if (telMatch) {
      const tel = normalizarTelefone(telMatch[1]);
      if (tel) dados.phone = tel;
    }
  }

  // Aniversário
  for (let i = 0; i < lowerLines.length; i++) {
    if (lowerLines[i].includes('aniversário') || lowerLines[i].includes('birthday') || lowerLines[i].includes('nascimento')) {
      if (lines[i + 1]) { dados.birthday = lines[i + 1]; break; }
    }
  }

  // Conexão desde
  for (let i = 0; i < lowerLines.length; i++) {
    if (lowerLines[i].includes('conexão desde') || lowerLines[i].includes('connected since') || lowerLines[i].includes('membro desde')) {
      if (lines[i + 1]) { dados.connected_since = lines[i + 1]; break; }
    }
  }

  // Website
  const links = root.querySelectorAll('a[href]');
  links.forEach(a => {
    const href = a.href || '';
    if (href.startsWith('http') && !href.includes('linkedin.com') && !dados.website) {
      dados.website = href;
    }
  });

  return dados;
}

// Aguarda elemento aparecer no DOM
async function aguardarElemento(selector, timeout = 4000) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

async function extrairExperiencia() {
  const expSection = document.querySelector('#experience')?.parentElement;
  if (!expSection) return { role: '', company: '' };
  const firstExp = expSection.querySelector('li');
  const texts = Array.from(firstExp?.querySelectorAll('span[aria-hidden="true"]') || [])
    .map(el => el.innerText.trim()).filter(t => t.length > 2);
  return {
    role: texts[0] || '',
    company: (texts[1] || '').split('·')[0].trim()
  };
}

// Captura dados do modal de contato (/overlay/contact-info)
async function capturarDadosContato(leadId) {
  exibirBanner('⏳ Lendo dados de contato...');

  // Aguarda o conteúdo do modal carregar — tenta múltiplos seletores
  const seletoresModal = [
    '.pv-contact-info__contact-type',
    '.pv-contact-info',
    '[data-view-name="profile-contact-info"]',
    '.artdeco-modal__content',
    'section.pv-contact-info',
    'main'
  ];

  let container = null;
  for (const sel of seletoresModal) {
    container = await aguardarElemento(sel, 3000);
    if (container) break;
  }

  // Aguarda mais um pouco para o conteúdo dinâmico carregar
  await esperar(1000);

  // Usa o body inteiro como fallback
  const root = container || document.body;
  const dados = extrairDadosDoTexto(root);

  // Também tenta links diretos
  const telLink = document.querySelector('a[href^="tel:"]');
  if (telLink && !dados.phone) {
    dados.phone = normalizarTelefone(telLink.href.replace('tel:', ''));
  }

  const emailLink = document.querySelector('a[href^="mailto:"]');
  if (emailLink && !dados.email) {
    dados.email = emailLink.href.replace('mailto:', '');
  }

  // Envia para API
  chrome.runtime.sendMessage(
    { action: 'apiRequest', method: 'PUT', path: `/api/leads/${leadId}`, body: dados },
    (res) => {
      if (res?.sucesso) {
        exibirBanner(
          `✅ Captura concluída!\n` +
          `📱 Tel: ${dados.phone || 'N/A'}\n` +
          `✉ Email: ${dados.email || 'N/A'}\n` +
          `🎂 Aniv: ${dados.birthday || 'N/A'}\n` +
          `🔗 Desde: ${dados.connected_since || 'N/A'}`,
          '#00c896'
        );
      } else {
        exibirBanner(`❌ Erro: ${res?.erro || 'falha na API'}`, '#ff3b5c');
      }
    }
  );
}

// Captura geral do perfil
async function iniciarCaptura(leadId) {
  exibirBanner('⏳ Iniciando captura...');
  const finalDados = {};

  // Localização
  const locEl = document.querySelector('.pv-text-details__left-panel span.text-body-small') ||
                document.querySelector('.pv-top-card--list li:last-child');
  if (locEl) finalDados.location = locEl.innerText.trim();

  // Experiência
  const { role, company } = await extrairExperiencia();
  if (role) finalDados.current_role = role;
  if (company) finalDados.current_company = company;

  chrome.runtime.sendMessage(
    { action: 'apiRequest', method: 'PUT', path: `/api/leads/${leadId}`, body: finalDados },
    (res) => {
      if (res?.sucesso) {
        exibirBanner(`✅ Captura concluída!\n${role} @ ${company}`, '#00c896');
      } else {
        exibirBanner(`❌ Erro: ${res?.erro || 'falha'}`, '#ff3b5c');
      }
    }
  );
}

// Detecta ação pela URL
const params = new URLSearchParams(window.location.search);
const lpAction = params.get('lp_action');
const lpLeadId = params.get('lp_lead_id');

if (lpLeadId) {
  if (lpAction === 'capture_contacts' || window.location.href.includes('/overlay/contact-info')) {
    capturarDadosContato(lpLeadId);
  } else if (lpAction === 'capture') {
    iniciarCaptura(lpLeadId);
  }
}

// Detecta navegação SPA para /overlay/contact-info
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    const p = new URLSearchParams(window.location.search);
    const id = p.get('lp_lead_id');
    if (id && location.href.includes('/overlay/contact-info')) {
      setTimeout(() => capturarDadosContato(id), 800);
    }
  }
}).observe(document.body, { subtree: true, childList: true });

// Sincroniza token enviado pelo CRM
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'LP_PROSPECTOR_TOKEN' && event.data?.token) {
    chrome.storage.local.set({ token: event.data.token });
  }
});
