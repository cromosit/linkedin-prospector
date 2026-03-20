import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarStats() }, [])

  const carregarStats = async () => {
    try {
      const res = await api.get('/api/leads/stats/dashboard')
      setStats(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' },
    header: { padding: '28px 32px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
    title: { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em' },
    subtitle: { fontSize: '13px', color: 'var(--text2)', marginTop: '2px' },
    content: { padding: '28px 32px', flex: 1 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' },
    statCard: { background: 'var(--bg2)', border: '1px solid var(--border)', padding: '20px 24px', animation: 'fadeIn 0.4s ease' },
    statLabel: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' },
    statValue: { fontSize: '32px', fontWeight: '700', letterSpacing: '-0.04em', fontFamily: 'var(--mono)' },
    statSub: { fontSize: '12px', color: 'var(--text2)', marginTop: '4px' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    panel: { background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' },
    panelTitle: { fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
    barItem: { marginBottom: '14px' },
    barLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' },
    barTrack: { height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' },
    barFill: (pct, color) => ({ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.8s ease' }),
    btn: { padding: '10px 20px', background: 'var(--blue)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    empty: { padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }
  }

  const total = stats?.total || 0
  const convertidos = stats?.porStatus?.convertido || 0
  const taxa = total > 0 ? Math.round((convertidos / total) * 100) : 0

  const statusCfg = { novo: { label: 'Novos', color: 'var(--blue-bright)' }, contatado: { label: 'Contatados', color: 'var(--yellow)' }, em_negociacao: { label: 'Negociando', color: 'var(--orange)' }, convertido: { label: 'Convertidos', color: 'var(--green)' }, descartado: { label: 'Descartados', color: 'var(--red)' } }
  const grauCfg = { '1': { label: '🟢 1º Grau', color: 'var(--green)' }, '2': { label: '🔵 2º Grau', color: 'var(--blue-bright)' }, '3': { label: '⚪ 3º Grau', color: 'var(--text3)' } }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.header}>
          <div><h1 style={S.title}>Dashboard</h1><p style={S.subtitle}>Visão geral da sua prospecção</p></div>
          <button style={S.btn} onClick={() => navigate('/leads')}>+ Gerenciar Leads</button>
        </div>
        <div style={S.content}>
          <div style={S.statsGrid}>
            {[
              { label: 'Total de Leads', value: loading ? '—' : total, sub: 'todos os canais', color: 'var(--text)' },
              { label: 'Convertidos', value: loading ? '—' : convertidos, sub: 'fechamentos', color: 'var(--green)' },
              { label: 'Taxa de Conversão', value: loading ? '—' : `${taxa}%`, sub: 'do total', color: 'var(--orange)' },
              { label: 'Quentes', value: loading ? '—' : (stats?.porTemperatura?.quente || 0), sub: '1º grau / alta prioridade', color: 'var(--red)' },
            ].map((card, i) => (
              <div key={i} style={{ ...S.statCard, animationDelay: `${i * 0.08}s` }}>
                <div style={S.statLabel}>{card.label}</div>
                <div style={{ ...S.statValue, color: card.color }}>{card.value}</div>
                <div style={S.statSub}>{card.sub}</div>
              </div>
            ))}
          </div>
          <div style={S.row}>
            <div style={S.panel}>
              <div style={S.panelTitle}>Pipeline por Status</div>
              {loading ? <div style={S.empty}>Carregando...</div> : total === 0 ? (
                <div style={S.empty}>Nenhum lead ainda.<br /><span style={{ color: 'var(--blue-bright)', cursor: 'pointer' }} onClick={() => navigate('/leads')}>Adicionar primeiro lead →</span></div>
              ) : Object.entries(statusCfg).map(([key, cfg]) => {
                const qty = stats?.porStatus?.[key] || 0
                const pct = total > 0 ? Math.round((qty / total) * 100) : 0
                return (
                  <div key={key} style={S.barItem}>
                    <div style={S.barLabel}><span style={{ color: 'var(--text2)' }}>{cfg.label}</span><span style={{ fontFamily: 'var(--mono)' }}>{qty}</span></div>
                    <div style={S.barTrack}><div style={S.barFill(pct, cfg.color)} /></div>
                  </div>
                )
              })}
            </div>
            <div style={S.panel}>
              <div style={S.panelTitle}>Por Grau de Conexão</div>
              {loading ? <div style={S.empty}>Carregando...</div> : total === 0 ? (
                <div style={S.empty}>Nenhum lead ainda.</div>
              ) : Object.entries(grauCfg).map(([key, cfg]) => {
                const qty = stats?.porGrau?.[key] || 0
                const pct = total > 0 ? Math.round((qty / total) * 100) : 0
                return (
                  <div key={key} style={S.barItem}>
                    <div style={S.barLabel}><span style={{ color: 'var(--text2)' }}>{cfg.label}</span><span style={{ fontFamily: 'var(--mono)' }}>{qty}</span></div>
                    <div style={S.barTrack}><div style={S.barFill(pct, cfg.color)} /></div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
