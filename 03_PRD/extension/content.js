// content.js — MOTOR DE CAPTURA v3.8.5 MASTER (JULIO VERSION) — CROMOSIT IT
console.log('LinkedIn Prospector MASTER (Captura Individual) Ativo!');

function createFloatingButton() {
  if (document.getElementById('prospector-btn-float')) return;
  
  const btn = document.createElement('button');
  btn.id = 'prospector-btn-float';
  btn.innerHTML = '🎯 CAPTURAR ESTE LEAD';
  btn.style.cssText = `
    position: fixed; top: 100px; right: 20px; z-index: 99999;
    background: #1d8fe8; color: white; border: none; padding: 12px 20px;
    border-radius: 4px; font-weight: bold; cursor: pointer;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: Inter, sans-serif;
  `;
  
  btn.addEventListener('click', captureThisProfile);
  document.body.appendChild(btn);
}

async function captureThisProfile() {
  const btn = document.getElementById('prospector-btn-float');
  btn.disabled = true;
  btn.innerText = 'CHAMANDO O CRM...';
  
  const name = document.querySelector('h1.text-heading-xlarge')?.innerText || '';
  const headline = document.querySelector('.text-body-medium.break-words')?.innerText || '';
  const location = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText || '';
  const linkedin_url = window.location.href;
  
  const leadData = {
    name,
    headline,
    location,
    linkedin_url,
    company: headline.split(' at ')[1] || headline.split(' na ')[1] || 'Não identificado',
    status: 'novo',
    source: 'perfil_individual_master'
  };

  chrome.runtime.sendMessage({ action: 'save_lead', lead: leadData }, (response) => {
    console.log('Sync Master Response:', response);
    btn.innerText = '✅ LEAD NO CRM SAP!';
    setTimeout(() => {
      btn.innerText = '🎯 CAPTURAR NOVAMENTE';
      btn.disabled = false;
    }, 2000);
  });
}

// Iniciar quando o perfil carregar (ex: Julio César)
if (window.location.href.includes('/in/')) {
  setTimeout(createFloatingButton, 2000);
}
