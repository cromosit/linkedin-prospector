import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api'

// ==========================================
// CONFIGURAÇÕES DE DISPLAY
// ==========================================
const STATUS_CFG = {
  novo:          { label: 'Novos',       color: 'var(--blue-bright)' },
  contatado:     { label: 'Contatados',  color: 'var(--yellow)' },
  respondeu:     { label: 'Responderam', color: 'var(--orange)' },
  em_negociacao: { label: 'Negociando',  color: 'var(--orange)' },
  fechado:       { label: 'Fechados',    color: 'var(--green)' },
  descartado:    { label: 'Descartados', color: 'var(--red)' }
}

const TEMP_CFG = {
  quente: { label: '🔴 Quente', color: '#ff3b5c' },
  morno:  { label: '🟡 Morno',  color: '#ffd60a' },
  frio:   { label: '⚪ Frio',   color: '#8899aa' }
}

const GRAU_CFG = {
  '1': { label: '🟢 1º Grau (direto)',     color: 'var(--green)' },
  '2': { label: '🔵 2º Grau (em comum)',   color: 'var(--blue-bright)' },
  '3': { label: '⚪ 3º Grau (fora da rede)', color: 'var(--text3)' }
}

const FONTE_LABELS = {
  chrome_extension: 'Extensão Chrome',
  importacao:       'Importação',
  manual:           'Manual',
  linkedin_login:   'Login LinkedIn'
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================
function BarraProgresso({ label, valor, total, color, sub }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
          {valor} <span style={{ color: 'var(--text3)', fontSize: '11px' }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function PainelCard({ title, children }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '22px 24px', borderRadius: '2px' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '18px', color: 'var(--text)', letterSpacing: '0.02em' }}>{title}</div>
      {children}
    </div>
  )
}

// ==========================================
// DASHBOARD PRINCIPAL
// ==========================================
export default function Dashboard() {
  const navigate        = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ultimaAtual, setUltimaAtual] = useState(null)

  useEffect(() => { 
    carregarStats() 
    // Auto-refresh a cada 30 segundos para tempo real
    const interval = setInterval(carregarStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const carregarStats = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/stats/summary')
      setStats(res.data)
      setUltimaAtual(new Date())
    } catch (err) {
      console.error('Erro ao carregar stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const total         = stats?.leads_total || 0
  const leadsHoje     = stats?.leads_hoje || 0
  const tarefas       = stats?.tarefas_pendentes || 0
  const taxaConversao = stats?.taxa_conversao || '0%'
  const funil         = stats?.funil || {}

  const S = {
    layout:   { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
    main:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' },
    header:   { padding: '24px 32px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
    title:    { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em' },
    subtitle: { fontSize: '12px', color: 'var(--text2)', marginTop: '3px' },
    content:  { padding: '24px 32px', flex: 1 },

    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '14px',
      marginBottom: '24px'
    },
    statCard: {
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      padding: '18px 22px',
      animation: 'fadeIn 0.4s ease',
      borderRadius: '2px'
    },
    statLabel: { fontSize: '10px', color: 'var(--text3)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' },
    statValue: { fontSize: '30px', fontWeight: '700', letterSpacing: '-0.04em', fontFamily: 'var(--mono)' },
    statSub:   { fontSize: '11px', color: 'var(--text2)', marginTop: '4px' },

    gridPaineis: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '14px'
    },

    btnPrimary: {
      padding: '9px 20px',
      background: 'var(--blue)',
      border: 'none',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      borderRadius: '3px'
    },
    btnSec: {
      padding: '9px 16px',
      background: 'transparent',
      border: '1px solid var(--border)',
      color: 'var(--text2)',
      fontSize: '12px',
      cursor: 'pointer',
      borderRadius: '3px'
    },
    empty: { padding: '30px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>

        {/* CABEÇALHO */}
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Dashboard</h1>
            <p style={S.subtitle}>
              Visão geral da prospecção
              {ultimaAtual && (
                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text3)' }}>
                  · Atualizado às {ultimaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.1)', 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700' }}>TOKEN EXTENSÃO:</span>
              <code style={{ fontSize: '10px', color: '#94a3b8', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {localStorage.getItem('token')}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(localStorage.getItem('token'));
                  alert('Token copiado! Cole na extensão.');
                }}
                style={{ 
                  background: '#3b82f6', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: '10px', 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                COPIAR
              </button>
            </div>
            <button style={S.btnSec} onClick={carregarStats} disabled={loading}>
              {loading ? '⏳' : '🔄'} Atualizar
            </button>
            <button style={S.btnPrimary} onClick={() => navigate('/leads')}>
              + Gerenciar Leads
            </button>
          </div>
        </div>

        <div style={S.content}>

          {/* CARDS DE MÉTRICAS */}
          <div style={S.statsGrid}>
            {[
              { label: 'Total de Leads',     value: loading ? '—' : total,           sub: 'base completa',          color: 'var(--text)' },
              { label: 'Capturados Hoje',    value: loading ? '—' : leadsHoje,       sub: 'velocidade de captura', color: 'var(--blue-bright)' },
              { label: 'Taxa de Conversão',  value: loading ? '—' : taxaConversao,   sub: 'leads vs contatados',   color: 'var(--green)' },
              { label: 'Tarefas Pendentes',  value: loading ? '—' : tarefas,          sub: 'follow-ups agendados',  color: 'var(--orange)' },
            ].map((card, i) => (
              <div key={i} style={{ ...S.statCard, animationDelay: `${i * 0.07}s` }}>
                <div style={S.statLabel}>{card.label}</div>
                <div style={{ ...S.statValue, color: card.color }}>{card.value}</div>
                <div style={S.statSub}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* PAINÉIS */}
          <div style={S.gridPaineis}>

            {/* Pipeline por Status */}
            <PainelCard title="Pipeline por Status (Funil Real)">
              {loading ? (
                <div style={S.empty}>Carregando...</div>
              ) : total === 0 ? (
                <div style={S.empty}>
                  Nenhum lead ainda.{' '}
                  <span
                    style={{ color: 'var(--blue-bright)', cursor: 'pointer' }}
                    onClick={() => navigate('/leads')}
                  >
                    Adicionar →
                  </span>
                </div>
              ) : (
                Object.entries(STATUS_CFG).map(([key, cfg]) => (
                  <BarraProgresso
                    key={key}
                    label={cfg.label}
                    valor={funil[key] || 0}
                    total={total}
                    color={cfg.color}
                  />
                ))
              )}
            </PainelCard>

            {/* Por Temperatura */}
            <PainelCard title="Por Temperatura">
              {loading ? (
                <div style={S.empty}>Carregando...</div>
              ) : total === 0 ? (
                <div style={S.empty}>Nenhum lead ainda.</div>
              ) : (
                Object.entries(TEMP_CFG).map(([key, cfg]) => (
                  <BarraProgresso
                    key={key}
                    label={cfg.label}
                    valor={stats?.porTemperatura?.[key] || 0}
                    total={total}
                    color={cfg.color}
                  />
                ))
              )}
            </PainelCard>

            {/* Por Grau de Conexão */}
            <PainelCard title="Por Grau de Conexão">
              {loading ? (
                <div style={S.empty}>Carregando...</div>
              ) : total === 0 ? (
                <div style={S.empty}>Nenhum lead ainda.</div>
              ) : (
                Object.entries(GRAU_CFG).map(([key, cfg]) => (
                  <BarraProgresso
                    key={key}
                    label={cfg.label}
                    valor={stats?.porGrau?.[key] || 0}
                    total={total}
                    color={cfg.color}
                  />
                ))
              )}
            </PainelCard>

            {/* Por Fonte / Origem */}
            <PainelCard title="Por Fonte de Captação">
              {loading ? (
                <div style={S.empty}>Carregando...</div>
              ) : total === 0 ? (
                <div style={S.empty}>Nenhum lead ainda.</div>
              ) : Object.entries(stats?.porOrigem || {}).length === 0 ? (
                <div style={S.empty}>Sem dados de origem.</div>
              ) : (
                Object.entries(stats?.porOrigem || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, val]) => (
                    <BarraProgresso
                      key={key}
                      label={FONTE_LABELS[key] || key}
                      valor={val}
                      total={total}
                      color="var(--blue-bright)"
                    />
                  ))
              )}
            </PainelCard>

          </div>

          {/* RODAPÉ COM ATALHOS */}
          <div style={{
            marginTop: '24px',
            padding: '16px 22px',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Atalhos rápidos:</span>
            {[
              { label: '+ Novo Lead',         action: () => navigate('/leads'),          color: 'var(--blue)' },
              { label: '📤 Exportar CSV',      action: () => navigate('/leads'),          color: 'var(--green)' },
              { label: '🔄 Atualizar Stats',   action: carregarStats,                    color: 'var(--text3)' }
            ].map((a, i) => (
              <button
                key={i}
                onClick={a.action}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: `1px solid ${a.color}50`,
                  color: a.color,
                  fontSize: '12px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                {a.label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text3)' }}>
              LinkedIn Prospector v2.0 — Cromosit IT
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
