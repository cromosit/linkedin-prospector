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
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('todo');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    fetchStats(periodo, dataInicio, dataFim);
  }, [periodo, dataInicio, dataFim]);

  const fetchStats = async (p = periodo, dIni = dataInicio, dFim = dataFim) => {
    setLoading(true);
    try {
      let params = {};
      const hoje = new Date();
      let start = null;
      let end = null;
      let days = 30;

      if (p === 'hoje') {
        const d = new Date(hoje);
        d.setHours(0,0,0,0);
        start = d.toISOString();
        days = 1;
      } else if (p === '7d') {
        const d = new Date(hoje);
        d.setDate(d.getDate() - 7);
        d.setHours(0,0,0,0);
        start = d.toISOString();
        days = 7;
      } else if (p === '30d') {
        const d = new Date(hoje);
        d.setDate(d.getDate() - 30);
        d.setHours(0,0,0,0);
        start = d.toISOString();
        days = 30;
      } else if (p === 'mes') {
        const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        start = d.toISOString();
        days = hoje.getDate();
      } else if (p === 'custom') {
        if (dIni) {
          const d = new Date(dIni + 'T00:00:00');
          start = d.toISOString();
        }
        if (dFim) {
          const d = new Date(dFim + 'T23:59:59');
          end = d.toISOString();
        }
        if (dIni && dFim) {
          const diffTime = Math.abs(new Date(dFim) - new Date(dIni));
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        }
      }

      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const [resDashboard, resPerformance] = await Promise.all([
        api.get('/api/leads/stats/dashboard', { params }),
        api.get('/api/leads/stats/performance', { params: { ...params, days } })
      ]);

      setStats(resDashboard.data);
      setPerformanceData(resPerformance.data);
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
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
             <select
               value={periodo}
               onChange={(e) => setPeriodo(e.target.value)}
               style={{
                 background: 'rgba(15, 23, 42, 0.6)',
                 backdropFilter: 'blur(12px)',
                 border: '1px solid rgba(255, 255, 255, 0.1)',
                 color: '#f8fafc',
                 fontSize: '0.85rem',
                 padding: '10px 16px',
                 borderRadius: '12px',
                 cursor: 'pointer',
                 outline: 'none'
               }}
             >
               <option value="todo">Todo o período</option>
               <option value="hoje">Hoje</option>
               <option value="7d">Últimos 7 dias</option>
               <option value="30d">Últimos 30 dias</option>
               <option value="mes">Mês atual</option>
               <option value="custom">Personalizado</option>
             </select>

             {periodo === 'custom' && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <input
                   type="date"
                   value={dataInicio}
                   onChange={(e) => setDataInicio(e.target.value)}
                   style={{
                     background: 'rgba(15, 23, 42, 0.6)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     color: '#f8fafc',
                     fontSize: '0.85rem',
                     padding: '8px 12px',
                     borderRadius: '12px',
                     outline: 'none'
                   }}
                 />
                 <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>até</span>
                 <input
                   type="date"
                   value={dataFim}
                   onChange={(e) => setDataFim(e.target.value)}
                   style={{
                     background: 'rgba(15, 23, 42, 0.6)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     color: '#f8fafc',
                     fontSize: '0.85rem',
                     padding: '8px 12px',
                     borderRadius: '12px',
                     outline: 'none'
                   }}
                 />
               </div>
             )}

             <button style={S.btnSecondary} onClick={exportCsv}>Extrair Dados</button>
             <button style={S.btnPrimary} onClick={() => fetchStats(periodo, dataInicio, dataFim)}>Sincronizar BI</button>
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

         {/* GRÁFICO DE CAPTURA DIÁRIA */}
         <div style={S.card}>
           <h3 style={{margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 800}}>Volume de Captura Diária (Performance)</h3>
           {loading ? (
             <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Carregando dados...</div>
           ) : !performanceData || Object.keys(performanceData.grafico_captura || {}).length === 0 ? (
             <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Sem dados de captura no período selecionado.</div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                 <span>Período: {performanceData.periodo.dias} dias analisados</span>
                 <span>Taxa de Conversão: <b style={{color: '#10b981'}}>{performanceData.metricas.taxa_conversao}</b></span>
               </div>
               <div style={{
                 display: 'flex',
                 alignItems: 'flex-end',
                 justifyContent: 'space-between',
                 height: '150px',
                 paddingTop: '20px',
                 gap: '8px',
                 overflowX: 'auto'
               }}>
                 {Object.entries(performanceData.grafico_captura || {})
                   .sort(([a], [b]) => a.localeCompare(b))
                   .map(([dia, count]) => {
                     const maxVal = Math.max(...Object.values(performanceData.grafico_captura), 1);
                     const heightPct = (count / maxVal) * 100;
                     const formatDia = dia.split('-').slice(1).reverse().join('/');
                     return (
                       <div key={dia} style={{
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         flex: 1,
                         minWidth: '35px'
                       }}>
                         <span style={{ fontSize: '10px', color: '#fff', marginBottom: '4px', fontWeight: 'bold' }}>{count}</span>
                         <div style={{
                           width: '100%',
                           height: `${heightPct}%`,
                           minHeight: count > 0 ? '4px' : '0px',
                           background: 'linear-gradient(180deg, #3b82f6 0%, rgba(59, 130, 246, 0.2) 100%)',
                           borderRadius: '4px 4px 0 0',
                           transition: 'height 0.5s ease-in-out'
                         }} title={`${dia}: ${count} leads`} />
                         <span style={{ fontSize: '9px', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>{formatDia}</span>
                       </div>
                     );
                   })
                 }
               </div>
             </div>
           )}
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
