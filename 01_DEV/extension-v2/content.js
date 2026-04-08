// content.js — LinkedIn Prospector v5.6 ULTRA — Cérebro Nominação Real

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function exibirBanner(texto, cor = '#1d8fe8') {
  const old = document.getElementById('lp-banner-v4');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'lp-banner-v4';
  banner.style.cssText = `position:fixed;top:25px;right:25px;z-index:9999999;padding:18px 22px;background:#00ffc8;color:#00332c;font-family:sans-serif;font-size:14px;font-weight:800;border-radius:12px;box-shadow:0 15px 50px rgba(0,255,200,0.4);max-width:420px;white-space:pre-wrap;line-height:1.4;border-left:8px solid #008f70;`;
  banner.innerHTML = `<div style="margin-bottom:10px;font-size:11px;opacity:1;letter-spacing:1.5px;font-weight:900;color:#005544">🏛️ LP v5.8.3 SKILLS</div>` + texto;
  document.body.appendChild(banner);
  if (cor === '#00c896' || cor === '#00ffc8') setTimeout(() => banner.remove(), 6000);
}

console.log('%c🏛️ LINKEDIN PROSPECTOR v3.0.0 ULTRA ATIVADO!', 'color: #00ffc8; font-size: 30px; font-weight: bold; text-shadow: 2px 2px #000;');
console.log('%c⚠️ SE VOCÊ NÃO VER ESTA MENSAGEM GIGANTE, SUA EXTENSÃO ESTÁ NA PASTA ERRADA!', 'color: #ff3b5c; font-size: 16px; font-weight: bold;');

// 1️⃣ LÓGICA DE CAPTURA INDIVIDUAL - SENSOR DE NOME REAL (H1 + TITLE)
async function capturarPerfilIndividual() {
  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim();
  exibirBanner(`🕵️ CAPTURANDO: ${nomeExibicao}...`, '#1d8fe8');
  await esperar(1000);

  let nome = document.querySelector('h1')?.innerText.trim();
  if (!nome || nome.length < 3) nome = document.title.split('|')[0].trim();
  const headline = document.querySelector('.text-body-medium.break-words')?.innerText.trim();
  const url = window.location.href.split('?')[0];

  // SENSOR DE GRAU DE CONEXÃO (v5.9.1 PRECISION)
  let grau = '3'; // Default para fora da rede
  const grauTexto = document.querySelector('.dist-value, .entity-result__badge, .pv-member-badge--level')?.innerText || document.body.innerText;
  if (grauTexto.includes('1º')) grau = '1';
  else if (grauTexto.includes('2º')) grau = '2';
  else if (grauTexto.includes('3º')) grau = '3';

  const lead = {
    name: nome || 'Lead Desconhecido', headline: headline || '',
    linkedin_url: url, source: 'linkedin_profile', status: 'novo',
    connection_degree: grau
  };

  try {
    const res = await fetch('https://linkedin-prospector-production.up.railway.app/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead)
    });
    if (res.ok) {
        exibirBanner(`✅ SALVO COM SUCESSO!\nLead: ${lead.name}\nGrau: ${grau}º`, '#00ffc8');
    } else {
        throw new Error('Falha no Servidor');
    }
  } catch (err) {
    chrome.storage.local.get(['pendingLeads'], (data) => {
        const pending = data.pendingLeads || [];
        pending.push(lead);
        chrome.storage.local.set({ pendingLeads: pending });
        exibirBanner('📡 SALVO LOCALMENTE: Enviando ao CRM em breve!', '#ffaa00');
    });
  }
}

// 2️⃣ LÓGICA DE ENVIO (MENSAGEIRO DINÂMICO)
async function injetarTextoFormatado(elemento, texto) {
  elemento.focus();
  const p = elemento.querySelector('p') || elemento; p.innerHTML = ''; 
  try {
     const dt = new DataTransfer(); dt.setData('text/plain', texto);
     const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
     elemento.dispatchEvent(ev);
     if (p.innerText.length < 5) document.execCommand('insertText', false, texto);
  } catch (e) { p.innerText = texto; }
  elemento.dispatchEvent(new Event('input', { bubbles: true }));
}

async function focarEEnviar() {
  await esperar(1500);
  const btnEnviar = document.querySelector('.msg-overlay-conversation-bubble [type="submit"], .msg-form__send-button, button.artdeco-button--primary[type="submit"]');
  if (btnEnviar) { btnEnviar.click(); exibirBanner('✅ MENSAGEM ENVIADA!', '#00c896'); await esperar(1500); window.close(); }
}

async function automatizarChat(mensagem) {
  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim();
  exibirBanner(`🚀 MODO ENVIO: Injetando mensagem para ${nomeExibicao}...`, '#1d8fe8');
  
  // 1. Abre o chat se estiver fechado
  let btnMsg = document.querySelector('.pvs-profile-actions button[aria-label^="Enviar mensagem"]') || 
               Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enviar mensagem'));
  if (btnMsg && !document.querySelector('.msg-overlay-conversation-bubble')) { 
      btnMsg.click(); 
      await esperar(2500); 
  }

  // 2. Busca a caixa de texto (Sensor Universal v5.8.6)
  let caixa = document.querySelector('.msg-form__contenteditable, .msg-overlay-conversation-bubble [contenteditable="true"], [role="textbox"], .msg-form__textarea');
  
  if (!caixa) {
      // Tenta busca por ARIA label (Sempre funciona se o campo existir)
      caixa = Array.from(document.querySelectorAll('[contenteditable="true"]')).find(el => 
          el.getAttribute('aria-label')?.includes('mensagem') || el.innerText.includes('Escreva')
      );
  }

  if (caixa) { 
      caixa.focus();
      caixa.click();
      await esperar(800);
      await injetarTextoFormatado(caixa, mensagem); 
      await focarEEnviar(); 
  } else {
      exibirBanner('❌ ERRO: Caixa de chat não encontrada (v5.8.6)!', '#ff3b5c');
  }
}

async function automatizarConexao(mensagem) {
  const nomeExibicao = (document.querySelector('h1')?.innerText || document.title.split('|')[0]).trim();
  exibirBanner(`🔗 CONEXÃO: Analisando perfil de ${nomeExibicao}...`, '#1d8fe8');
  const perfilInfo = await aguardarConteudo(['· 1º', '1st degree', 'Conectar'], 15000);
  if (perfilInfo.includes('· 1º') || perfilInfo.includes('1st degree')) return await automatizarChat(mensagem);
  const btnNota = await aguardarElemento('button[aria-label="Adicionar nota"]', 6000);
  if (btnNota) {
    btnNota.click();
    const textarea = await aguardarElemento('textarea[name="message"]', 3000);
    if (textarea) {
      textarea.value = mensagem.length > 200 ? mensagem.substring(0, 197) + '...' : mensagem;
      textarea.dispatchEvent(new Event('input', { bubbles: true })); await esperar(1000);
      const btnEnviar = document.querySelector('button[aria-label="Enviar agora"]');
      if (btnEnviar) btnEnviar.click(); exibirBanner('✅ SOLICITAÇÃO ENVIADA!', '#00c896'); await esperar(1500); window.close();
    }
  } else { await automatizarChat(mensagem); }
}

async function aguardarElemento(sel, timeout) {
  return new Promise(res => {
    const el = document.querySelector(sel); if(el) return res(el);
    const obs = new MutationObserver(() => {
        const v = document.querySelector(sel);
        if(v){ obs.disconnect(); res(v); }
    });
    obs.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => { obs.disconnect(); res(null); }, timeout);
  });
}

async function aguardarConteudo(termos, timeout) {
  return new Promise(res => {
    const check = () => termos.some(t => document.body.innerText.includes(t));
    if(check()) return res(document.body.innerText);
    const obs = new MutationObserver(() => { if(check()){obs.disconnect(); res(document.body.innerText);} });
    obs.observe(document.body, { childList:true, subtree:true, characterData:true });
    setTimeout(() => { obs.disconnect(); res(document.body.innerText); }, timeout);
  });
}

// 3️⃣ SENSOR DE PRESENÇA AGRESSIVO (v5.8 ULTRA)
function monitorarPerfil() {
    if (!window.location.href.includes('/in/')) return;
    
    // Verifica se o botão já existe para não duplicar
    if (document.getElementById('lp-btn-float-v58')) return;

    // Busca o nome com redundância (H1 ou Title)
    let nome = document.querySelector('h1')?.innerText.trim();
    if (!nome) nome = document.title.split('|')[0].trim();

    if (nome && !nome.includes('LinkedIn')) {
        const btn = document.createElement('button');
        btn.id = 'lp-btn-float-v58';
        btn.innerHTML = `<span>⚡</span> Capturar <b>${nome.split(' ')[0]}</b>`;
        btn.style.cssText = `position:fixed;bottom:30px;right:30px;z-index:9999999;background:#1d8fe8;color:white;border:none;padding:18px 28px;border-radius:50px;font-weight:800;cursor:pointer;box-shadow:0 15px 45px rgba(29,143,232,0.5);border:3px solid white;font-family:Inter,sans-serif;font-size:16px;display:flex;align-items:center;gap:10px;transition:all 0.3s;`;
        btn.onmouseover = () => btn.style.transform = 'scale(1.05) translateY(-5px)';
        btn.onmouseout = () => btn.style.transform = 'scale(1) translateY(0)';
        btn.onclick = capturarPerfilIndividual;
        document.body.appendChild(btn);
        console.log(`[v5.8] ✅ Botão injetado para: ${nome}`);
    }
}

// 4️⃣ MOTOR DE ATUALIZAÇÃO DE STATUS E HISTÓRICO
async function registrarSucessoEnvio(linkedinUrl) {
    const leadId = params.get('leadId'); // ID passado via URL pelo CRM
    if (!leadId) return;

    chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'PUT',
        path: `/api/leads/${leadId}`,
        body: { status: 'contatado', notes: `Mensagem enviada automaticamente via LinkedIn em ${new Date().toLocaleString()}` }
    }, (res) => {
        if (res.sucesso) {
            exibirBanner('🏛️ CRM ATUALIZADO: Status alterado para "Contatado"!', '#00c896');
            // Registra atividade no histórico
            chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'POST',
                path: `/api/leads/${leadId}/atividades`,
                body: { type: 'mensagem_enviada', description: 'Mensagem enviada automaticamente via LinkedIn Prospector' }
            });
        }
    });
}

// INICIALIZAÇÃO v5.8
const params = new URLSearchParams(window.location.search);
if (params.get('lp_msg')) {
    const m = decodeURIComponent(params.get('lp_msg'));
    const act = params.get('lp_action');
    setTimeout(async () => {
      if (act === 'send_message') {
          await automatizarChat(m);
          await registrarSucessoEnvio(window.location.href);
      }
      else if (act === 'connect') await automatizarConexao(m);
    }, 2000);
} else {
    // Observer para capturar mudanças no DOM (estratégia SPA do LinkedIn)
    const observer = new MutationObserver(monitorarPerfil);
    observer.observe(document.body, { childList: true, subtree: true });
    monitorarPerfil(); // Execução inicial
}

// 🏛️ FRONTEND DESIGN SKILL (v5.9.0 PREMIUM UI)
function exibirBanner(mensagem, cor = '#1a1a1a') {
    const id = 'lp-banner-elite';
    let banner = document.getElementById(id);
    if (!banner) {
        banner = document.createElement('div');
        banner.id = id;
        Object.assign(banner.style, {
            position: 'fixed', top: '24px', right: '24px', zIndex: '9999999',
            minWidth: '320px', padding: '16px 20px', borderRadius: '12px',
            backgroundColor: cor, color: '#FFFFFF', fontSize: '14px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex',
            alignItems: 'center', gap: '12px', letterSpacing: '-0.01em',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });
        document.body.appendChild(banner);
    }

    const icone = mensagem.includes('✅') ? '🚀' : mensagem.includes('❌') ? '🛡️' : '🔭';
    banner.innerHTML = `
        <div style="font-size: 24px">${icone}</div>
        <div style="line-height: 1.4; font-weight: 600">${mensagem.replace('\n', '<br>')}</div>
    `;
    
    banner.style.transform = 'translateX(0) scale(1)';
    setTimeout(() => {
        banner.style.transform = 'translateX(150%) scale(0.9)';
    }, 4500);
}
