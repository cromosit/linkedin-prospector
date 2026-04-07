import { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'

export default function Relatorios() {
  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'Inter, sans-serif' },
    main: { flex: 1, padding: '2rem', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '2rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    titleBox: { display: 'flex', flexDirection: 'column' },
    title: { fontSize: '2rem', fontWeight: 800, margin: 0, color: '#f8fafc' },
    subtitle: { opacity: 0.5, fontSize: '0.9rem' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' },
    card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    cardTitle: { fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardValue: { fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 },
    statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' },
    badge: (color, bg) => ({ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, color: color, background: bg }),
    actionZone: { display: 'flex', gap: '1rem', alignItems: 'center' },
    btnPrimary: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' },
    btnExport: { background: 'transparent', border: '1px dashed #3b82f6', color: '#3b82f6', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }
  }

  const [stats, setStats] = useState({
    total: 0,
    porStatus: {},
    porTemperatura: {},
    porOrigem: {},
    porGrau: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // No ambiente de DEV, pegamos os status reais direto do Motor Backend Master
      const res = await axios.get('http://localhost:3000/leads/stats/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err);
    } finally {
      setLoading(false);
    }
  }

  const exportCsv = async () => {
    alert("📥 Processando extração de dados Master Cromosit IT...");
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/leads', { 
         headers: { Authorization: `Bearer ${token}` },
         params: { limit: 5000 } // Trazemos tudo para o CSV
      });
      
      const leads = res.data.leads || [];
      if (!leads.length) return alert("Nenhum lead para exportar.");
      
      const header = ["Nome", "Empresa", "Cargo", "Email", "Telefone", "Status", "Temperatura", "Origem", "LinkedIn"].join(",");
      const rows = leads.map(l => [
        `"${l.name || ''}"`, `"${l.company || ''}"`, `"${l.headline || l.current_role || ''}"`, 
        `"${l.email || ''}"`, `"${l.phone || ''}"`, `"${l.status || ''}"`, 
        `"${l.temperature || ''}"`, `"${l.source || ''}"`, `"${l.linkedin_url || ''}"`
      ].join(","));
      
      const csv = [header, ...rows].join("\\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `exportacao_cromosit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("❌ Falha na exportação: " + e.message);
    }
  }

  // Cálculos de KPI conforme o Blueprint v9.0
  const novos = stats.porStatus['novo'] || 0;
  const contatados = (stats.porStatus['contatado'] || 0) + (stats.porStatus['respondeu'] || 0) + (stats.porStatus['fechado'] || 0);
  const totalLeads = stats.total || 0;
  
  const taxaContato = totalLeads ? Math.round((contatados / totalLeads) * 100) : 0;
  const resposta = stats.porStatus['respondeu'] || 0;
  const taxaResposta = contatados ? Math.round((resposta / contatados) * 100) : 0;
  const fechados = stats.porStatus['fechado'] || 0;

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <header style={S.header}>
          <div style={S.titleBox}>
             <h1 style={S.title}>BI & RELATÓRIOS V9.0</h1>
             <p style={S.subtitle}>Arquitetura V9 Master | KPIs de Prospecção Cromosit IT</p>
          </div>
          <div style={S.actionZone}>
             <button style={S.btnExport} onClick={exportCsv}>📥 EXPORTAR CSV BKP</button>
             <button style={S.btnPrimary} onClick={fetchStats}>🔄 ATUALIZAR BI</button>
          </div>
        </header>

        {/* CENA 1: KPIs DE SUCESSO (Blueprint 7.1) */}
        <div style={S.grid}>
           <div style={S.card}>
              <div style={S.cardTitle}>LEADS CAPTURADOS MÊS</div>
              <div style={S.cardValue}>{loading ? '...' : totalLeads}</div>
              <div style={{fontSize: '0.8rem', color: '#10b981'}}>↗ Meta 1.500/mês</div>
           </div>
           <div style={S.card}>
              <div style={S.cardTitle}>TAXA DE CONTATO (WHATSAPP/INBOX)</div>
              <div style={S.cardValue}>{loading ? '...' : taxaContato}%</div>
              <div style={{fontSize: '0.8rem', color: '#3b82f6'}}>↗ Meta Blueprint: 90%</div>
           </div>
           <div style={S.card}>
              <div style={S.cardTitle}>TAXA DE RESPOSTA</div>
              <div style={S.cardValue}>{loading ? '...' : taxaResposta}%</div>
              <div style={{fontSize: '0.8rem', color: '#f59e0b'}}>↗ Meta Blueprint: 20%</div>
           </div>
           <div style={S.card}>
              <div style={S.cardTitle}>CONTRATOS FECHADOS (SAP/TI)</div>
              <div style={S.cardValue} style={{...S.cardValue, color: '#10b981'}}>{loading ? '...' : fechados}</div>
              <div style={{fontSize: '0.8rem', color: '#10b981'}}>↗ ROAS Projetado: +R$ 75k</div>
           </div>
        </div>

        {/* CENA 2: FUNIL DE VENDAS E INTELIGÊNCIA */}
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem'}}>
           
           <div style={S.card}>
              <div style={{...S.cardTitle, color: '#fff'}}>📊 SEU FUNIL DE VENDAS (STATUS)</div>
              
              <div style={S.statRow}>
                 <div><span style={{fontSize:'1.2rem', marginRight:'10px'}}>📥</span> <b>Novos Capturados</b> (Falta abordar)</div>
                 <div style={S.badge('#fff', '#1e293b')}>{stats.porStatus['novo'] || 0} leads</div>
              </div>
              <div style={S.statRow}>
                 <div><span style={{fontSize:'1.2rem', marginRight:'10px'}}>📱</span> <b>Contatados</b> (WhatsApp enviado)</div>
                 <div style={S.badge('#3b82f6', '#3b82f620')}>{stats.porStatus['contatado'] || 0} leads</div>
              </div>
              <div style={S.statRow}>
                 <div><span style={{fontSize:'1.2rem', marginRight:'10px'}}>💬</span> <b>Responderam</b> (Qualificação M2)</div>
                 <div style={S.badge('#f59e0b', '#f59e0b20')}>{stats.porStatus['respondeu'] || 0} leads</div>
              </div>
              <div style={S.statRow}>
                 <div><span style={{fontSize:'1.2rem', marginRight:'10px'}}>🤝</span> <b>Em Negociação</b> (Call Feita)</div>
                 <div style={S.badge('#8b5cf6', '#8b5cf620')}>{stats.porStatus['negociacao'] || 0} leads</div>
              </div>
              <div style={{...S.statRow, borderBottom: 'none'}}>
                 <div><span style={{fontSize:'1.2rem', marginRight:'10px'}}>🏆</span> <b>Fechados / Won</b> (Contrato)</div>
                 <div style={S.badge('#10b981', '#10b98120')}>{stats.porStatus['fechado'] || 0} clientes</div>
              </div>
           </div>

           <div style={S.card}>
              <div style={{...S.cardTitle, color: '#fff'}}>🔥 TEMPERATURA DA BASE</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem'}}>
                 <div style={{display: 'flex', justifyContent: 'space-between', background: '#ef444420', padding: '15px', borderRadius: '8px'}}>
                    <b style={{color: '#ef4444'}}>🔥 QUENTES</b>
                    <b style={{color: '#fff'}}>{stats.porTemperatura['quente'] || 0}</b>
                 </div>
                 <div style={{display: 'flex', justifyContent: 'space-between', background: '#f59e0b20', padding: '15px', borderRadius: '8px'}}>
                    <b style={{color: '#f59e0b'}}>⚡ MORNOS</b>
                    <b style={{color: '#fff'}}>{stats.porTemperatura['morno'] || 0}</b>
                 </div>
                 <div style={{display: 'flex', justifyContent: 'space-between', background: '#3b82f620', padding: '15px', borderRadius: '8px'}}>
                    <b style={{color: '#3b82f6'}}>❄️ FRIOS</b>
                    <b style={{color: '#fff'}}>{stats.porTemperatura['frio'] || 0}</b>
                 </div>
              </div>
              
              <div style={{marginTop: '2rem'}}>
                 <div style={S.cardTitle}>📍 ORIGEM MÁQUINA</div>
                 <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom:'8px'}}>
                    <span>🕵️ Capturas Manuais (Inbox):</span> <b>{stats.porOrigem['manual'] || 0}</b>
                 </div>
                 <div style={{marginTop: '10px', display: 'flex', justifyContent: 'space-between'}}>
                    <span>🛰️ Captura Radar Em Massa:</span> <b>{stats.porOrigem['importacao'] || 0}</b>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  )
}
