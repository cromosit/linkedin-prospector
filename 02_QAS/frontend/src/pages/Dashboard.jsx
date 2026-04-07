import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    porStatus: {},
    porTemperatura: {},
    porOrigem: {},
    porGrau: {}
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarStats()
  }, [])

  const carregarStats = async () => {
    try {
      const res = await api.get('/api/leads/stats/dashboard')
      setStats(res.data)
    } catch (err) { console.error('Erro dashboard:', err) }
    finally { setLoading(false) }
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main: { flex: 1, padding: '30px 40px', overflow: 'auto' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' },
    card: (bg) => ({ background: bg || '#121922', padding: '25px', borderRadius: '4px', border: '1px solid #233142', position: 'relative', overflow: 'hidden' }),
    kpiValue: { fontSize: '32px', fontWeight: '900', color: '#00ffc8', marginBottom: '5px' },
    kpiLabel: { fontSize: '11px', color: '#8899aa', fontWeight: 'bold', textTransform: 'uppercase' },
    
    chartGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' },
    chartBox: { background: '#121922', padding: '25px', borderRadius: '4px', border: '1px solid #233142' },
    title: { fontSize: '14px', fontWeight: '900', color: '#1d8fe8', marginBottom: '25px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' },
    
    bar: (w, color) => ({ width: w || '0%', height: '8px', background: color || '#1d8fe8', borderRadius: '10px', boxShadow: `0 0 10px ${color}40` }),
    statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }
  }

  if (loading) return <div style={S.layout}><b>Carregando Painel de Elite...</b></div>

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={{...S.title, fontSize:'20px', color:'#fff', marginBottom:'30px'}}>🛡️ CENTRO DE COMANDO BI <span style={{fontSize:'12px', color:'#00ffc8', background:'#00ffc810', padding:'4px 12px', borderRadius:'20px'}}>v11.0 ELITE</span></div>

        {/* KPIs GIGANTES */}
        <div style={S.grid}>
           <div style={S.card()}>
              <div style={S.kpiValue}>{stats.total}</div>
              <div style={S.kpiLabel}>Base Total de Leads</div>
              <div style={{position:'absolute', right:'-10px', top:'20px', opacity:0.1, fontSize:'60px'}}>👥</div>
           </div>
           <div style={S.card()}>
              <div style={S.kpiValue}>{stats.porStatus['contatado'] || 0}</div>
              <div style={S.kpiLabel}>Disparos ChatWA (Sucesso)</div>
              <div style={{position:'absolute', right:'-10px', top:'20px', opacity:0.1, fontSize:'60px'}}>🚀</div>
           </div>
           <div style={S.card()}>
              <div style={S.kpiValue}>{Math.round(((stats.porStatus['contatado'] || 0) / (stats.total || 1)) * 100)}%</div>
              <div style={S.kpiLabel}>Taxa de Conversão LinkedIn ➡️ Zap</div>
              <div style={{position:'absolute', right:'-10px', top:'20px', opacity:0.1, fontSize:'60px'}}>⚡</div>
           </div>
           <div style={S.card()}>
              <div style={S.kpiValue}>{stats.porStatus['qualificado'] || 0}</div>
              <div style={{...S.kpiLabel, color:'#00c896'}}>Taxa de Interesse Real</div>
              <div style={{position:'absolute', right:'-10px', top:'20px', opacity:0.1, fontSize:'60px'}}>🤝</div>
           </div>
        </div>

        {/* GRÁFICOS DE CONVERSÃO (FUNIL ALV) */}
        <div style={{...S.chartBox, marginBottom:'30px'}}>
           <div style={S.title}>🛡️ EFICIÊNCIA DO FUNIL (RATIO DE CONVERSÃO)</div>
           <div style={{display:'flex', gap:'5px', alignItems:'flex-end', height:'100px'}}>
              {['novo', 'qualificado', 'contatado', 'fechado'].map(st => {
                 const count = stats.porStatus[st] || 0
                 const h = Math.round((count / (stats.total || 1)) * 100)
                 return (
                   <div key={st} style={{flex:1, textAlign:'center'}}>
                      <div style={{fontSize:'10px', color:'#00ffc8', marginBottom:'5px'}}>{h}%</div>
                      <div style={{background: st === 'novo' ? '#1d8fe8' : '#00c896', height:`${h}px`, borderRadius:'3px 3px 0 0', minHeight:'5px'}} />
                      <div style={{fontSize:'9px', marginTop:'5px', color:'#8899aa'}}>{st.toUpperCase()}</div>
                   </div>
                 )
              })}
           </div>
        </div>

        {/* GRÁFICOS DE DECISÃO */}
        <div style={S.chartGrid}>
           <div style={S.chartBox}>
              <div style={S.title}>📍 STATUS DO FUNIL DE VENDAS</div>
              {Object.entries(stats.porStatus).map(([status, count]) => (
                <div key={status} style={{marginBottom:'20px'}}>
                   <div style={S.statusRow}>
                      <span style={{fontSize:'12px', fontWeight:'700'}}>{status.toUpperCase()}</span>
                      <span style={{fontSize:'12px', color:'#8899aa'}}>{count} leads ({Math.round((count/stats.total)*100)}%)</span>
                   </div>
                   <div style={{background:'#0b1118', height:'8px', borderRadius:'10px'}}>
                      <div style={S.bar(`${(count/stats.total)*100}%`, status === 'novo' ? '#1d8fe8' : status === 'contatado' ? '#00ffc8' : '#ff9f0a')} />
                   </div>
                </div>
              ))}
           </div>

           <div style={S.chartBox}>
              <div style={S.title}>⚖️ TEMPERATURA DOS LEADS</div>
              <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                 {['quente', 'morno', 'frio'].map(t => {
                   const count = stats.porTemperatura[t] || 0
                   const perc = Math.round((count / stats.total) * 100) || 0
                   return (
                     <div key={t} style={{display:'flex', gap:'15px', alignItems:'center'}}>
                        <div style={{width:'80px', fontSize:'11px', color:'#8899aa'}}>{t.toUpperCase()}</div>
                        <div style={{flex:1, background:'#0b1118', height:'25px', borderRadius:'3px', position:'relative', overflow:'hidden'}}>
                           <div style={{width:`${perc}%`, height:'100%', background: t==='quente'?'#ff3b5c':t==='morno'?'#ff9f0a':'#1d8fe8', opacity:0.8}} />
                           <span style={{position:'absolute', right:'10px', top:'4px', fontSize:'11px', fontWeight:'bold'}}>{count}</span>
                        </div>
                     </div>
                   )
                 })}
              </div>
           </div>
        </div>

        {/* RODAPÉ DE ALV */}
        <div style={{marginTop:'40px', background:'#121922', padding:'20px', borderRadius:'4px', border:'1px solid #1d8fe850', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
           <div style={{fontSize:'12px', color:'#8899aa'}}>Relatório Gerencial gerado em <b>{new Date().toLocaleString()}</b></div>
           <button style={{background:'#1d8fe8', color:'#fff', border:'none', padding:'8px 20px', borderRadius:'3px', fontWeight:'bold', cursor:'pointer'}} onClick={() => window.location.href='/leads'}>⬅ Voltar para Operação Leads</button>
        </div>
      </div>
    </div>
  )
}
