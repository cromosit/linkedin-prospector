import { useState, useEffect } from 'react'
import api from '../api'
import Sidebar from '../components/Sidebar'

export default function Relatorios() {
  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'Outfit, sans-serif' },
    main: { flex: 1, padding: '2rem', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '2rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    titleBox: { display: 'flex', flexDirection: 'column' },
    title: { fontSize: '2.5rem', fontWeight: 900, margin: 0, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' },
    subtitle: { opacity: 0.6, fontSize: '0.95rem', fontWeight: 500, color: '#94a3b8' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' },
    
    // Glassmorphism Card
    card: { 
      background: 'rgba(15, 23, 42, 0.6)', 
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.05)', 
      borderRadius: '24px', 
      padding: '2rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem', 
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      transition: 'transform 0.3s ease, border-color 0.3s ease'
    },
    
    kpiLabel: { fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' },
    kpiValue: { fontSize: '3rem', fontWeight: 900, color: '#fff', lineHeight: 1, margin: '0.5rem 0' },
    kpiTrend: (color) => ({ fontSize: '0.85rem', fontWeight: 600, color: color, display: 'flex', alignItems: 'center', gap: '4px' }),
    
    funnelItem: (bg) => ({ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1.2rem', 
      background: bg, 
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.03)',
      marginBottom: '0.75rem',
      transition: 'all 0.2s ease'
    }),
    
    badge: (color, bg) => ({ padding: '6px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, color: color, background: bg, border: `1px solid ${color}30` }),
    
    btnPrimary: { 
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
      color: '#fff', 
      border: 'none', 
      padding: '12px 24px', 
      borderRadius: '12px', 
      fontWeight: 700, 
      cursor: 'pointer',
      boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)'
    },
    btnSecondary: { 
      background: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid rgba(255, 255, 255, 0.1)', 
      color: '#f8fafc', 
      padding: '12px 24px', 
      borderRadius: '12px', 
      fontWeight: 700, 
      cursor: 'pointer' 
    }
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
      const res = await api.get('/api/leads/stats/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err);
    } finally {
      setLoading(false);
    }
  }

  const exportCsv = async () => {
    try {
      const res = await api.get('/api/leads', { 
         params: { limit: 5000 }
      });
      
      const leads = res.data.leads || [];
      if (!leads.length) return;
      
      const header = ["Nome", "Empresa", "Cargo", "Email", "Telefone", "Status", "Temperatura", "Origem", "LinkedIn"].join(",");
      const rows = leads.map(l => [
        `"${l.name || ''}"`, `"${l.company || ''}"`, `"${l.headline || l.current_role || ''}"`, 
        `"${l.email || ''}"`, `"${l.phone || ''}"`, `"${l.status || ''}"`, 
        `"${l.temperature || ''}"`, `"${l.source || ''}"`, `"${l.linkedin_url || ''}"`
      ].join(","));
      
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `leads_cromosit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Erro exportação:", e);
    }
  }

  const totalLeads = stats.total || 0;
  const respondidos = stats.porStatus['respondeu'] || 0;
  const fechados = stats.porStatus['fechado'] || 0;
  const taxaConversao = totalLeads ? Math.round((fechados / totalLeads) * 100) : 0;

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <header style={S.header}>
          <div style={S.titleBox}>
             <h1 style={S.title}>Inteligência de Mercado</h1>
             <p style={S.subtitle}>Dashboard v9.0 — Monitoramento em tempo real Cromosit IT</p>
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
             <button style={S.btnSecondary} onClick={exportCsv}>Extrair Dados</button>
             <button style={S.btnPrimary} onClick={fetchStats}>Sincronizar BI</button>
          </div>
        </header>

        <div style={S.grid}>
           <div style={S.card}>
              <div style={S.kpiLabel}>Volume de Captura</div>
              <div style={S.kpiValue}>{loading ? '...' : totalLeads}</div>
              <div style={S.kpiTrend('#10b981')}>↑ 12% este mês</div>
           </div>
           <div style={S.card}>
              <div style={S.kpiLabel}>Taxa de Conversão</div>
              <div style={S.kpiValue}>{loading ? '...' : taxaConversao}%</div>
              <div style={S.kpiTrend('#3b82f6')}>Padrão Elite SAP</div>
           </div>
           <div style={S.card}>
              <div style={S.kpiLabel}>Leads Qualificados</div>
              <div style={S.kpiValue}>{loading ? '...' : respondidos}</div>
              <div style={S.kpiTrend('#f59e0b')}>Aguardando M2</div>
           </div>
           <div style={S.card}>
              <div style={S.kpiLabel}>Novos Contratos</div>
              <div style={S.kpiValue} style={{...S.kpiValue, color: '#10b981'}}>{loading ? '...' : fechados}</div>
              <div style={S.kpiTrend('#10b981')}>Faturamento Crescente</div>
           </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem'}}>
           
           <div style={S.card}>
              <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800}}>Funil de Vendas Dinâmico</h3>
              
              <div style={S.funnelItem('rgba(59, 130, 246, 0.1)')}>
                 <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center'}}>📥</div>
                    <div><b>Topo do Funil</b><br/><span style={{fontSize:'0.8rem', opacity:0.5}}>Leads Novos</span></div>
                 </div>
                 <span style={{fontSize:'1.5rem', fontWeight:800}}>{stats.porStatus['novo'] || 0}</span>
              </div>

              <div style={S.funnelItem('rgba(139, 92, 246, 0.1)')}>
                 <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'#8b5cf6', display:'flex', alignItems:'center', justifyContent:'center'}}>📱</div>
                    <div><b>Qualificação (Meio)</b><br/><span style={{fontSize:'0.8rem', opacity:0.5}}>Abordagem Realizada</span></div>
                 </div>
                 <span style={{fontSize:'1.5rem', fontWeight:800}}>{stats.porStatus['contatado'] || 0}</span>
              </div>

              <div style={S.funnelItem('rgba(245, 158, 11, 0.1)')}>
                 <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center'}}>🤝</div>
                    <div><b>Negociação (Fundo)</b><br/><span style={{fontSize:'0.8rem', opacity:0.5}}>Interesse Confirmado</span></div>
                 </div>
                 <span style={{fontSize:'1.5rem', fontWeight:800}}>{stats.porStatus['em_negociacao'] || 0}</span>
              </div>

              <div style={S.funnelItem('rgba(16, 185, 129, 0.15)')}>
                 <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center'}}>🏆</div>
                    <div><b>Conversão Final</b><br/><span style={{fontSize:'0.8rem', opacity:0.5}}>Clientes Fechados</span></div>
                 </div>
                 <span style={{fontSize:'1.5rem', fontWeight:800}}>{stats.porStatus['fechado'] || 0}</span>
              </div>
           </div>

           <div style={S.card}>
              <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800}}>Saúde da Base</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                 <div style={{background:'rgba(239, 68, 68, 0.1)', padding:'1.2rem', borderRadius:'16px', border:'1px solid rgba(239, 68, 68, 0.2)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                       <span style={{fontWeight:700, color:'#ef4444'}}>🔥 Leads Quentes</span>
                       <b>{stats.porTemperatura['quente'] || 0}</b>
                    </div>
                    <div style={{height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'10px', overflow:'hidden'}}>
                       <div style={{width:`${(stats.porTemperatura['quente']/totalLeads)*100 || 0}%`, height:'100%', background:'#ef4444'}}></div>
                    </div>
                 </div>

                 <div style={{background:'rgba(245, 158, 11, 0.1)', padding:'1.2rem', borderRadius:'16px', border:'1px solid rgba(245, 158, 11, 0.2)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                       <span style={{fontWeight:700, color:'#f59e0b'}}>⚡ Leads Mornos</span>
                       <b>{stats.porTemperatura['morno'] || 0}</b>
                    </div>
                    <div style={{height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'10px', overflow:'hidden'}}>
                       <div style={{width:`${(stats.porTemperatura['morno']/totalLeads)*100 || 0}%`, height:'100%', background:'#f59e0b'}}></div>
                    </div>
                 </div>

                 <div style={{background:'rgba(59, 130, 246, 0.1)', padding:'1.2rem', borderRadius:'16px', border:'1px solid rgba(59, 130, 246, 0.2)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                       <span style={{fontWeight:700, color:'#3b82f6'}}>❄️ Leads Frios</span>
                       <b>{stats.porTemperatura['frio'] || 0}</b>
                    </div>
                    <div style={{height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'10px', overflow:'hidden'}}>
                       <div style={{width:`${(stats.porTemperatura['frio']/totalLeads)*100 || 0}%`, height:'100%', background:'#3b82f6'}}></div>
                    </div>
                 </div>
              </div>

              <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                 <div style={S.kpiLabel}>Rede de Conexão (Grau)</div>
                 <div style={{display:'flex', justifyContent:'space-between', marginTop:'1rem', fontSize:'0.9rem'}}>
                    <span>🥇 1º Grau (Conectados)</span>
                    <b style={{color:'#10b981'}}>{stats.porGrau['1'] || 0}</b>
                 </div>
                 <div style={{display:'flex', justifyContent:'space-between', marginTop:'0.5rem', fontSize:'0.9rem'}}>
                    <span>🥈 2º Grau (Em comum)</span>
                    <b style={{color:'#f59e0b'}}>{stats.porGrau['2'] || 0}</b>
                 </div>
                 <div style={{display:'flex', justifyContent:'space-between', marginTop:'0.5rem', fontSize:'0.9rem'}}>
                    <span>🥉 3º Grau (Fora da rede)</span>
                    <b style={{color:'#64748b'}}>{stats.porGrau['3'] || 0}</b>
                 </div>
              </div>

              <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                 <div style={S.kpiLabel}>Radar de Origem</div>
                 <div style={{display:'flex', justifyContent:'space-between', marginTop:'1rem', fontSize:'0.9rem'}}>
                    <span>🕵️ Captura Manual</span>
                    <b style={{color:'#3b82f6'}}>{stats.porOrigem['manual'] || 0}</b>
                 </div>
                 <div style={{display:'flex', justifyContent:'space-between', marginTop:'0.5rem', fontSize:'0.9rem'}}>
                    <span>🛰️ Radar em Massa</span>
                    <b style={{color:'#8b5cf6'}}>{stats.porOrigem['importacao'] || 0}</b>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  )
}
