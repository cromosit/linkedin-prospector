import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

// ==========================================
// CONFIGURAÇÕES DE DISPLAY
// ==========================================
const STATUS = {
  novo:          { label: 'Novo',       color: 'var(--blue-bright)' },
  contatado:     { label: 'Contatado',  color: 'var(--yellow)' },
  respondeu:     { label: 'Respondeu',  color: 'var(--orange)' },
  em_negociacao: { label: 'Negociando', color: 'var(--orange)' },
  fechado:       { label: 'Fechado',    color: 'var(--green)' },
  descartado:    { label: 'Descartado', color: 'var(--red)' }
}

const TEMPERATURA = {
  quente: { label: '🔴 Quente', color: '#ff3b5c' },
  morno:  { label: '🟡 Morno',  color: '#ffd60a' },
  frio:   { label: '⚪ Frio',   color: '#8899aa' }
}

const GRAU = {
  '1': { label: '1º Grau',   color: '#00c896' },
  '2': { label: '2º Grau',   color: '#1d8fe8' },
  '3': { label: '3º / Fora', color: '#8899aa' }
}

const FORM_EMPTY = {
  name: '', headline: '', company: '', location: '',
  linkedin_url: '', email: '', phone: '', website: '',
  birthday: '', connected_since: '', mutual_connections: '',
  about: '', service_interest: '', temperature: 'morno',
  notes: '', source: 'manual', connection_degree: '3',
  current_role: '', current_company: '', instant_messaging: '',
  group_name: '',
  score: 30, status: 'novo', legal_basis: 'Legítimo Interesse'
}

const LIMIT = 20

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function Leads() {
  // Lista
  const [leads, setLeads]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [pagina, setPagina]         = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const formatAging = (date) => {
    if (!date) return null;
    const diff = new Date() - new Date(date);
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  // Filtros
  const [filtroStatus, setFiltroStatus]   = useState('')
  const [filtroTemp, setFiltroTemp]       = useState('')
  const [filtroGrau, setFiltroGrau]       = useState('')
  const [exportando, setExportando]       = useState(false)
  const [selecionados, setSelecionados]   = useState([])

  // Modal / Form
  const [modal, setModal]           = useState(false)
  const [leadSel, setLeadSel]       = useState(null)
  const [form, setForm]             = useState(FORM_EMPTY)
  const [atividades, setAtividades] = useState([])
  const [salvando, setSalvando]     = useState(false)
  const [gerandoMsg, setGerandoMsg] = useState(false)
  const [tipoMsg, setTipoMsg]       = useState('conexao')
  const [msgGerada, setMsgGerada]   = useState('')
  const [enriquecendo, setEnriquecendo] = useState(false)
  const [toast, setToast]           = useState(null)

  // Recarrega quando filtros/busca/página mudam
  useEffect(() => { carregarLeads() }, [busca, pagina, filtroStatus, filtroTemp, filtroGrau])

  // Reseta para página 1 quando filtros mudarem
  useEffect(() => { setPagina(1) }, [busca, filtroStatus, filtroTemp, filtroGrau])

  const carregarLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: LIMIT,
        page:  pagina
      })
      if (busca)        params.set('search', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroTemp)   params.set('temperature', filtroTemp)
      if (filtroGrau)   params.set('connection_degree', filtroGrau)

      const res = await api.get(`/api/leads?${params.toString()}`)
      setLeads(res.data.leads || [])
      setTotalLeads(res.data.pagination?.total || 0)
      setTotalPages(res.data.pagination?.totalPages || 1)
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }, [busca, pagina, filtroStatus, filtroTemp, filtroGrau])

  const showToast = (msg, tipo = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // ─── CRUD ────────────────────────────────────
  const salvarLead = async () => {
    if (!form.name?.trim()) { showToast('❌ Nome é obrigatório', 'error'); return }
    setSalvando(true)
    try {
      if (leadSel) await api.put(`/api/leads/${leadSel.id}`, form)
      else          await api.post('/api/leads', form)
      setModal(false)
      carregarLeads()
      showToast(leadSel ? '✅ Lead atualizado!' : '✅ Lead criado!')
    } catch (err) {
      showToast('❌ Erro ao salvar lead', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const purgaLGPD = async () => {
    if (!leadSel || !window.confirm(`⚠️ AÇÃO LGPD: Você confirma a remoção PERMANENTE de todos os dados sensíveis de "${leadSel.name}" conforme Art. 18 da LGPD? Esta ação será registrada para fins de auditoria.`)) return
    try {
      await api.post(`/api/leads/${leadSel.id}/lgpd-purge`)
      setModal(false)
      carregarLeads()
      showToast('⚖️ Dados expurgados em conformidade com a LGPD')
    } catch (err) {
      showToast('❌ Erro na ação LGPD', 'error')
    }
  }

  const excluirLead = async () => {
    if (!leadSel || !window.confirm(`Excluir "${leadSel.name}"?`)) return
    try {
      await api.delete(`/api/leads/${leadSel.id}`)
      setModal(false)
      carregarLeads()
      showToast('✅ Lead excluído')
    } catch (err) {
      showToast('❌ Erro ao excluir', 'error')
    }
  }

  const excluirSelecionados = async () => {
    if (selecionados.length === 0) return
    if (!window.confirm(`Excluir ${selecionados.length} leads selecionados?`)) return
    
    setLoading(true)
    try {
      await api.delete('/api/leads/bulk-delete', { data: { ids: selecionados } })
      setSelecionados([])
      showToast(`✅ ${selecionados.length} leads excluídos!`)
      carregarLeads()
    } catch (err) {
      showToast('❌ Erro na exclusão em massa', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelecao = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleTodos = () => {
    if (selecionados.length === leads.length) setSelecionados([])
    else setSelecionados(leads.map(l => l.id))
  }

  // Atualiza status direto na tabela (salva no backend)
  const atualizarStatus = async (lead, novoStatus) => {
    const original = [...leads]
    // Otimistic update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: novoStatus } : l))
    try {
      await api.put(`/api/leads/${lead.id}`, { status: novoStatus })
    } catch (err) {
      setLeads(original)
      showToast('❌ Erro ao atualizar status', 'error')
    }
  }

  // ─── IA ──────────────────────────────────────
  const gerarAbordagem = async (tipo) => {
    if (!leadSel) { showToast('❌ Salve o lead antes de gerar mensagem', 'error'); return }
    setGerandoMsg(true)
    setTipoMsg(tipo)
    try {
      const res = await api.post(`/api/leads/${leadSel.id}/gerar-mensagem`, { tipo })
      setMsgGerada(res.data.mensagem)
    } catch (err) {
      setMsgGerada('❌ Erro ao gerar abordagem.')
    } finally {
      setGerandoMsg(false)
    }
  }

  const enriquecerLead = async () => {
    if (!leadSel) return
    setEnriquecendo(true)
    try {
      const res = await api.post(`/api/leads/${leadSel.id}/enriquecer`)
      setForm(prev => ({ ...prev, ...res.data.lead }))
      showToast('⚡ Lead enriquecido pela IA!')
    } catch (err) {
      showToast('❌ Erro no enriquecimento', 'error')
    } finally {
      setEnriquecendo(false)
    }
  }

  // ─── EXPORT CSV ──────────────────────────────
  const exportarCSV = async () => {
    setExportando(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroTemp)   params.set('temperature', filtroTemp)
      if (filtroGrau)   params.set('connection_degree', filtroGrau)

      const token = localStorage.getItem('token')
      const BASE  = import.meta.env.VITE_API_URL || ''
      const url   = `${BASE}/api/leads/export/csv?${params.toString()}`

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Erro ao exportar')

      const blob     = await res.blob()
      const link     = document.createElement('a')
      link.href      = URL.createObjectURL(blob)
      link.download  = `leads_${new Date().toISOString().slice(0,10)}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
      showToast('✅ CSV exportado com sucesso!')
    } catch (err) {
      showToast('❌ Erro ao exportar CSV', 'error')
    } finally {
      setExportando(false)
    }
  }

  // ─── MODAL ───────────────────────────────────
  const abrirEditar = async (lead) => {
    setLeadSel(lead)
    
    // Higieniza para evitar erro de 'value prop on input should not be null'
    const cleanForm = { ...FORM_EMPTY }
    Object.keys(FORM_EMPTY).forEach(key => {
      cleanForm[key] = (lead[key] !== null && lead[key] !== undefined) ? lead[key] : ''
    })
    
    setForm(cleanForm)
    setMsgGerada(lead.ai_message || '')
    setAtividades(lead.lead_activities || [])
    
    // Sugestão estratégica: 1º grau = 1º Contato | 2º ou 3º = Conectar
    setTipoMsg(lead.connection_degree === '1' ? 'primeiro_contato' : 'conexao')
    
    setModal(true)

    // Busca dados completos (incluindo atividades atualizadas)
    try {
      const res = await api.get(`/api/leads/${lead.id}`)
      if (res.data.lead) {
        setLeadSel(res.data.lead)
        setForm({ ...FORM_EMPTY, ...res.data.lead })
        setAtividades(res.data.lead.lead_activities || [])
      }
    } catch (err) { console.error(err) }
  }

  const logLinkedInAction = async () => {
    if (!leadSel) return
    try {
      await api.post(`/api/leads/${leadSel.id}/atividades`, {
        type: 'linkedin_aberto',
        description: 'Clique no botão "Enviar no LinkedIn" (abriu chat)'
      })
      // Recarrega as atividades no modal para aparecer na hora
      const res = await api.get(`/api/leads/${leadSel.id}`)
      setAtividades(res.data.lead.lead_activities || [])
    } catch (err) { console.error(err) }
  }

  const abrirNovo = () => {
    setLeadSel(null)
    setForm(FORM_EMPTY)
    setMsgGerada('')
    setModal(true)
  }

  // ─── ESTILOS ─────────────────────────────────
  const S = {
    layout:   { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    toolbar:  { padding: '10px 20px', background: '#121922', borderBottom: '1px solid #233142', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
    content:  { padding: '16px 20px', flex: 1, overflow: 'auto' },
    table:    { width: '100%', borderCollapse: 'collapse' },
    th:       { textAlign: 'left', padding: '10px 12px', color: '#8899aa', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid #233142', whiteSpace: 'nowrap' },
    td:       { padding: '12px', borderBottom: '1px solid #1c2633', fontSize: '13px', verticalAlign: 'middle' },
    badge:    (color) => ({ display: 'inline-block', padding: '2px 7px', background: color + '15', border: `1px solid ${color}40`, color, fontSize: '10px', borderRadius: '3px', whiteSpace: 'nowrap' }),
    input:    { width: '100%', background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '8px 12px', borderRadius: '3px', fontSize: '13px', outline: 'none' },
    select:   { background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '6px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', outline: 'none' },
    btnPrimary: (color) => ({ padding: '6px 14px', background: 'transparent', border: `1px solid ${color}`, color, borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }),
    btnIcon:  { background: 'transparent', border: 'none', color: '#1d8fe8', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px' },
    pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #1c2633', background: '#0f161e' },
    // Modal
    modal:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox:   { background: '#0d131b', width: '900px', maxWidth: '96vw', maxHeight: '92vh', overflow: 'auto', borderRadius: '4px', border: '1px solid #1d8fe840', display: 'flex', flexDirection: 'column' },
    modalHead:  { padding: '12px 20px', borderBottom: '1px solid #1d8fe820', display: 'flex', alignItems: 'center', background: '#121922', gap: '10px', flexShrink: 0 },
    modalBody:  { padding: '20px 24px', overflow: 'auto', flex: 1 },
    sectionTitle: (color) => ({ color: color || '#1d8fe8', fontSize: '10px', fontWeight: '800', marginBottom: '12px', marginTop: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${(color || '#1d8fe8')}20`, paddingBottom: '6px' }),
    label:      { color: '#8899aa', fontSize: '10px', fontWeight: '600', display: 'block', marginBottom: '4px' },
    headerBtn:  (color, bg) => ({ padding: '5px 12px', background: bg || '#1c2633', border: `1px solid ${color}40`, color, borderRadius: '3px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' })
  }

  // ─── RENDER ──────────────────────────────────
  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>

        {/* ── TOOLBAR ────────────────── */}
        <div style={S.toolbar}>
          <h3 style={{ margin: 0, fontSize: '15px', whiteSpace: 'nowrap' }}>
            Leads <span style={{ color: '#8899aa', fontSize: '12px' }}>({totalLeads})</span>
          </h3>

          <button style={S.btnPrimary('#1d8fe8')} onClick={abrirNovo}>＋ Novo Lead</button>

          {selecionados.length > 0 && (
            <button 
              style={{ ...S.btnPrimary('#ff3b5c'), background: '#ff3b5c20' }} 
              onClick={excluirSelecionados}
            >
              🗑 Excluir ({selecionados.length})
            </button>
          )}

          <input
            style={{ ...S.input, width: '200px', marginBottom: 0 }}
            placeholder="Buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          {/* Filtros */}
          <select style={S.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select style={S.select} value={filtroTemp} onChange={e => setFiltroTemp(e.target.value)}>
            <option value="">Todas temp.</option>
            {Object.entries(TEMPERATURA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select style={S.select} value={filtroGrau} onChange={e => setFiltroGrau(e.target.value)}>
            <option value="">Todos graus</option>
            {Object.entries(GRAU).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* Ações à direita */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button style={S.btnPrimary('#00ffc8')} onClick={carregarLeads}>🔄 Atualizar</button>
            <button
              style={S.btnPrimary(exportando ? '#8899aa' : '#00c896')}
              onClick={exportarCSV}
              disabled={exportando}
            >
              {exportando ? '⏳ Exportando...' : '📤 Exportar CSV'}
            </button>
            <button style={S.btnPrimary('#0088ff')} onClick={() => window.location.href = '/dashboard'}>📊 Dashboard</button>
          </div>
        </div>

        {/* ── TABELA ─────────────────── */}
        <div style={S.content}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#8899aa' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #233142', borderTop: '3px solid #1d8fe8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Carregando leads...
            </div>
          ) : leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#8899aa' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <p>Nenhum lead encontrado.</p>
              {(busca || filtroStatus || filtroTemp || filtroGrau) && (
                <button style={{ ...S.btnPrimary('#1d8fe8'), marginTop: '12px' }}
                  onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroTemp(''); setFiltroGrau('') }}>
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: '30px' }}>
                    <input 
                      type="checkbox" 
                      checked={leads.length > 0 && selecionados.length === leads.length} 
                      onChange={toggleTodos}
                    />
                  </th>
                  <th style={S.th}>LEAD</th>
                  <th style={S.th}>GRUPO</th>
                  <th style={S.th}>EMPRESA / LOCAL</th>
                  <th style={S.th}>CONTATO</th>
                  <th style={S.th}>GRAU</th>
                  <th style={S.th}>TEMP</th>
                  <th style={S.th}>FOLLOW-UP</th>
                  <th style={S.th}>STATUS</th>
                  <th style={S.th}>SCORE</th>
                  <th style={S.th}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0d1521'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...S.td, width: '30px' }}>
                      <input 
                        type="checkbox" 
                        checked={selecionados.includes(l.id)} 
                        onChange={() => toggleSelecao(l.id)}
                      />
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{l.name}</div>
                        {formatAging(l.stage_entered_at || l.created_at) && (
                          <span style={{ 
                            fontSize: '9px', 
                            background: '#1c2633', 
                            padding: '1px 4px', 
                            borderRadius: '2px', 
                            color: '#8899aa', 
                            border: '1px solid #233142',
                            fontFamily: 'var(--mono)'
                          }}>
                            ⏱️ {formatAging(l.stage_entered_at || l.created_at)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8899aa', marginTop: '2px' }}>{l.current_role || l.headline}</div>
                    </td>
                    <td style={S.td}>
                      <div style={{ 
                        fontSize: '11px', 
                        color: l.group_name ? 'var(--blue-bright)' : '#334455',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {l.group_name || '—'}
                      </div>
                    </td>
                    <td style={S.td}>
                      <div style={{ fontSize: '13px' }}>{l.current_company || l.company || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#8899aa' }}>📍 {l.location || '—'}</div>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {l.linkedin_url
                          ? <a href={l.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ fontSize: '16px', color: '#0a66c2' }}>🔗</a>
                          : <span style={{ color: '#333', fontSize: '16px' }}>🔗</span>
                        }
                        {l.phone
                          ? <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title={l.phone} style={{ fontSize: '16px' }}>💬</a>
                          : <span style={{ color: '#333', fontSize: '16px' }}>💬</span>
                        }
                        {l.email && <span style={{ fontSize: '11px', color: '#1d8fe8' }} title={l.email}>✉</span>}
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(GRAU[l.connection_degree]?.color || '#8899aa')}>
                        {GRAU[l.connection_degree]?.label || '—'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(TEMPERATURA[l.temperature]?.color || '#8899aa')}>
                        {TEMPERATURA[l.temperature]?.label || l.temperature || '—'}
                      </span>
                    </td>
                    <td style={S.td}>
                      {l.next_followup_at ? (
                        <div style={{ 
                          fontSize: '11px', 
                          color: new Date(l.next_followup_at) < new Date() ? '#ff3b5c' : '#8899aa',
                          fontWeight: new Date(l.next_followup_at) < new Date() ? 'bold' : 'normal'
                        }}>
                          📅 {new Date(l.next_followup_at).toLocaleDateString('pt-BR')}
                          {new Date(l.next_followup_at) < new Date() && ' ⚠️'}
                        </div>
                      ) : (
                        <span style={{ color: '#334455', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td style={S.td}>
                      {/* Select que salva no backend ao mudar */}
                      <select
                        style={{ ...S.select, borderColor: STATUS[l.status]?.color + '60' || '#233142' }}
                        value={l.status}
                        onChange={e => atualizarStatus(l, e.target.value)}
                      >
                        {Object.entries(STATUS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={S.td}>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: l.score >= 70 ? '#00c896' : l.score >= 40 ? '#ffd60a' : '#8899aa'
                      }}>
                        {l.score ?? '—'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <button style={S.btnIcon} onClick={() => abrirEditar(l)}>✏ Editar / IA</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINAÇÃO ──────────────── */}
        {!loading && totalLeads > 0 && (
          <div style={S.pagination}>
            <span style={{ fontSize: '12px', color: '#8899aa' }}>
              {Math.min((pagina - 1) * LIMIT + 1, totalLeads)}–{Math.min(pagina * LIMIT, totalLeads)} de {totalLeads} leads
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                style={{ ...S.btnPrimary(pagina > 1 ? '#8899aa' : '#333'), opacity: pagina <= 1 ? 0.4 : 1 }}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina <= 1}
              >← Anterior</button>
              <span style={{ fontSize: '12px', color: '#8899aa', padding: '0 8px' }}>
                {pagina} / {totalPages}
              </span>
              <button
                style={{ ...S.btnPrimary(pagina < totalPages ? '#8899aa' : '#333'), opacity: pagina >= totalPages ? 0.4 : 1 }}
                onClick={() => setPagina(p => Math.min(totalPages, p + 1))}
                disabled={pagina >= totalPages}
              >Próxima →</button>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL ═════════════════════════════════════════════════ */}
      {modal && (
        <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={S.modalBox}>

            {/* Cabeçalho */}
            <div style={S.modalHead}>
              <span style={{ fontWeight: '700', fontSize: '15px', flex: 1 }}>
                🏛️ {form.name || 'Novo Lead'}
              </span>
              {leadSel && (
                <button
                  style={S.headerBtn('#ff9f0a')}
                  onClick={enriquecerLead}
                  disabled={enriquecendo}
                >
                  {enriquecendo ? '⏳ Enriquecendo...' : '⚡ Enriquecer IA'}
                </button>
              )}
              <button style={S.headerBtn('#00c896')} onClick={salvarLead} disabled={salvando}>
                {salvando ? '⏳ Salvando...' : '✓ Salvar'}
              </button>
              {leadSel && (
                <button style={S.headerBtn('#ff3b5c')} onClick={excluirLead}>🗑 Excluir</button>
              )}
              {leadSel && (
                <button 
                  style={{ ...S.headerBtn('#fff'), background: 'var(--red)', fontWeight: 'bold' }} 
                  onClick={purgaLGPD}
                  title="Expurgar dados conforme Art. 18 da LGPD"
                >
                  ⚖️ Ação LGPD
                </button>
              )}
              <button style={{ ...S.headerBtn('#8899aa'), background: 'transparent' }} onClick={() => setModal(false)}>✕</button>
            </div>

            {/* Corpo */}
            <div style={S.modalBody}>

              {/* HISTÓRICO / TIMELINE */}
              <div style={S.sectionTitle('#8899aa')}>📜 HISTÓRICO DE ATIVIDADES</div>
              <div style={{ 
                background: '#0b1118', 
                borderRadius: '4px', 
                border: '1px solid #1c2633',
                maxHeight: '200px',
                overflow: 'auto',
                padding: '10px'
              }}>
                {atividades && atividades.length > 0 ? (
                  atividades
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map(at => (
                    <div key={at.id} style={{ 
                      padding: '8px 0', 
                      borderBottom: '1px solid #1c2633',
                      display: 'flex',
                      gap: '12px',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: '#8899aa', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
                        {new Date(at.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ 
                        color: at.type === 'whatsapp_enviado' ? '#00c896' : at.type === 'lead_capturado' ? '#1d8fe8' : '#fff',
                        fontWeight: 'bold',
                        minWidth: '100px'
                      }}>
                        {at.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span style={{ color: '#aaa' }}>{at.description}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#556677', textAlign: 'center', padding: '10px', fontSize: '12px' }}>
                    Nenhuma atividade registrada ainda.
                  </div>
                )}
              </div>

              {/* IDENTIFICAÇÃO */}
              <div style={S.sectionTitle()}>👤 IDENTIFICAÇÃO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label style={S.label}>NOME *</label>
                  <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>HEADLINE (LinkedIn)</label>
                  <input style={S.input} value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} />
                </div>
                <div>
                  <label style={{ ...S.label, color: '#00c896' }}>CARGO ATUAL</label>
                  <input style={{ ...S.input, borderColor: '#00c89640' }} value={form.current_role} onChange={e => setForm({ ...form, current_role: e.target.value })} />
                </div>
                <div>
                  <label style={{ ...S.label, color: '#00c896' }}>EMPRESA ATUAL</label>
                  <input style={{ ...S.input, borderColor: '#00c89640' }} value={form.current_company} onChange={e => setForm({ ...form, current_company: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>LOCALIZAÇÃO</label>
                  <input style={S.input} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>EMPRESA (Headline)</label>
                  <input style={S.input} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <label style={{ ...S.label, color: 'var(--blue-bright)' }}>🏷️ GRUPO / CLASSIFICAÇÃO</label>
                  <input style={{ ...S.input, borderColor: 'var(--blue-bright)40' }} value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })} placeholder="Ex: Pesquisa SAP MM" />
                </div>
              </div>

              {/* STATUS / CLASSIFICAÇÃO */}
              <div style={S.sectionTitle('#ffd60a')}>🎯 STATUS E CLASSIFICAÇÃO</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label style={S.label}>STATUS</label>
                  <select style={{ ...S.input, padding: '8px' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>TEMPERATURA</label>
                  <select style={{ ...S.input, padding: '8px' }} value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })}>
                    {Object.entries(TEMPERATURA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>GRAU DE CONEXÃO</label>
                  <select style={{ ...S.input, padding: '8px' }} value={form.connection_degree} onChange={e => setForm({ ...form, connection_degree: e.target.value })}>
                    {Object.entries(GRAU).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>SCORE (0–100)</label>
                  <input style={S.input} type="number" min="0" max="100" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ ...S.label, color: 'var(--green)' }}>🛡️ BASE LEGAL (LGPD)</label>
                  <select 
                    style={{ ...S.input, padding: '8px', borderColor: 'var(--green)40' }} 
                    value={form.legal_basis} 
                    onChange={e => setForm({ ...form, legal_basis: e.target.value })}
                  >
                    <option value="Legítimo Interesse">Legítimo Interesse (B2B Prospecting)</option>
                    <option value="Consentimento">Consentimento do Titular</option>
                    <option value="Execução de Contrato">Execução de Contrato</option>
                    <option value="Cumprimento de Obrigação Legal">Cumprimento de Obrigação Legal</option>
                  </select>
                </div>
              </div>

              {/* CONTATO */}
              <div style={S.sectionTitle()}>📞 CONTATO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label style={S.label}>LINKEDIN URL</label>
                  <input style={S.input} value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>E-MAIL</label>
                  <input style={S.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>TELEFONE / WHATSAPP</label>
                  <input style={S.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="5541..." />
                </div>
                <div>
                  <label style={S.label}>SITE / WEB</label>
                  <input style={S.input} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>ANIVERSÁRIO</label>
                  <input style={S.input} value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>CONEXÕES EM COMUM</label>
                  <input style={S.input} value={form.mutual_connections} onChange={e => setForm({ ...form, mutual_connections: e.target.value })} />
                </div>
              </div>

              {/* IA: interesse e notas */}
              <div style={S.sectionTitle('#ff9f0a')}>🤖 INTEL DA IA</div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...S.label, color: '#ff9f0a' }}>O QUE ESTE LEAD PRECISA?</label>
                <textarea
                  style={{ ...S.input, height: '52px', resize: 'vertical', borderColor: '#ff9f0a30' }}
                  value={form.service_interest}
                  onChange={e => setForm({ ...form, service_interest: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...S.label, color: '#ff3b5c' }}>NOTAS ESTRATÉGICAS</label>
                <textarea
                  style={{ ...S.input, height: '80px', resize: 'vertical', borderColor: '#ff3b5c30' }}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div>
                <label style={S.label}>BIO / SOBRE (do LinkedIn)</label>
                <textarea
                  style={{ ...S.input, height: '70px', resize: 'vertical' }}
                  value={form.about}
                  onChange={e => setForm({ ...form, about: e.target.value })}
                />
              </div>

              {/* MENSAGEM COM IA */}
              <div style={S.sectionTitle('#1d8fe8')}>✦ MENSAGEM COM IA</div>

              {/* Tipo de mensagem */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[
                  { k: 'conexao',           label: '🔗 Conexão' },
                  { k: 'conexao_com_comum', label: '👥 Com Comum' },
                  { k: 'primeiro_contato',  label: '💬 1º Contato' },
                  { k: 'follow_up',         label: '🔄 Follow-up' },
                  { k: 'whatsapp',          label: '📱 WhatsApp' }
                ].map(({ k, label }) => (
                  <button
                    key={k}
                    onClick={() => setTipoMsg(k)}
                    style={{
                      padding: '5px 12px',
                      background: tipoMsg === k ? 'rgba(29,143,232,0.15)' : 'transparent',
                      border: tipoMsg === k ? '1px solid #1d8fe8' : '1px solid #233142',
                      color: tipoMsg === k ? '#1d8fe8' : '#8899aa',
                      borderRadius: '3px', fontSize: '11px', cursor: 'pointer'
                    }}
                  >{label}</button>
                ))}
              </div>

              {/* Ações da mensagem */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  style={S.headerBtn('#ff9f0a')}
                  onClick={() => gerarAbordagem(tipoMsg)}
                  disabled={gerandoMsg || !leadSel}
                >
                  {gerandoMsg ? '⏳ Gerando...' : '✦ Gerar Mensagem'}
                </button>
                <button
                  style={S.headerBtn('#8899aa')}
                  onClick={() => navigator.clipboard.writeText(msgGerada).then(() => showToast('📋 Copiado!'))}
                  disabled={!msgGerada}
                >
                  📋 Copiar
                </button>
                <button
                  style={S.headerBtn('#1d8fe8')}
                  onClick={() => gerarAbordagem(tipoMsg)}
                  disabled={gerandoMsg || !leadSel}
                >
                  🔄 Regenerar
                </button>
                {leadSel && (
                  <button
                    style={S.headerBtn('#0a66c2')}
                    onClick={() => {
                      logLinkedInAction()
                      const target = form.linkedin_id || form.linkedin_url?.split('/in/')[1]?.split('/')[0]
                      const url = form.connection_degree === '1'
                        ? `https://www.linkedin.com/messaging/compose/?recipient=${target}&body=${encodeURIComponent(msgGerada)}&lp_msg=${encodeURIComponent(msgGerada)}`
                        : `${form.linkedin_url}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada)}`
                      window.open(url, '_blank')
                    }}
                  >
                    🚀 Enviar no LinkedIn
                  </button>
                )}
              </div>

              {/* Caixa da mensagem editável */}
              <textarea
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid #1d8fe840',
                  borderRadius: '4px',
                  background: '#0b1118',
                  minHeight: '120px',
                  lineHeight: '1.7',
                  fontSize: '14px',
                  color: '#e8edf2',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  display: 'block',
                  marginBottom: '12px'
                }}
                value={msgGerada}
                onChange={e => setMsgGerada(e.target.value)}
                placeholder="Selecione o tipo e clique em 'Gerar Mensagem' ou escreva aqui..."
              />

              {/* WHATSAPP */}
              <div style={S.sectionTitle('#00c896')}>📱 WHATSAPP</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #00c89620', borderRadius: '4px', background: '#0b1118' }}>
                <span style={{ color: '#00c896', fontSize: '12px', whiteSpace: 'nowrap' }}>📞 Número:</span>
                <input
                  style={{ ...S.input, width: '180px', marginBottom: 0 }}
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="5541..."
                />
                <button
                  style={{ ...S.headerBtn('#00c896', 'rgba(0,200,150,0.08)'), marginLeft: 'auto' }}
                  onClick={() => {
                    const num = form.phone?.replace(/\D/g, '')
                    if (!num) { showToast('❌ Informe o telefone', 'error'); return }
                    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msgGerada)}`, '_blank')
                  }}
                >
                  💬 Abrir WhatsApp
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          background: toast.tipo === 'error' ? '#ff3b5c' : '#00c896',
          color: '#fff', padding: '10px 28px', borderRadius: '4px',
          zIndex: 10000, fontWeight: '600', fontSize: '13px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
