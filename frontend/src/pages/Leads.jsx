import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import LeadHistorico from '../components/LeadHistorico'
import api from '../api'

const STATUS = {
  novo: { label: 'Novo', color: 'var(--blue-bright)' },
  contatado: { label: 'Contatado', color: 'var(--yellow)' },
  respondeu: { label: 'Respondeu', color: 'var(--orange)' },
  em_negociacao: { label: 'Negociando', color: 'var(--orange)' },
  fechado: { label: 'Fechado', color: 'var(--green)' },
  descartado: { label: 'Descartado', color: 'var(--red)' }
}
const TEMP = {
  quente: { label: '🔥 Quente', color: 'var(--red)' },
  morno: { label: '⚡ Morno', color: 'var(--orange)' },
  frio: { label: '❄️ Frio', color: 'var(--blue-bright)' }
}
const GRAU = {
  '1': { label: '1º', color: '#00c896', desc: 'Conexão direta' },
  '2': { label: '2º', color: '#1d8fe8', desc: 'Amigo de amigo' },
  '3': { label: '3º', color: '#8899aa', desc: 'Fora da rede' }
}

const FORM_EMPTY = {
  name: '', headline: '', company: '', location: '',
  linkedin_url: '', email: '', phone: '', website: '',
  birthday: '', connected_since: '', mutual_connections: '',
  about: '', service_interest: '', temperature: 'frio',
  notes: '', source: 'manual', connection_degree: '3'
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTemp, setFiltroTemp] = useState('')
  const [filtroGrau, setFiltroGrau] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const LIMIT = 20

  const [modal, setModal] = useState(false)
  const [leadSel, setLeadSel] = useState(null)
  const [form, setForm] = useState(FORM_EMPTY)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(null)

  const [gerandoMsg, setGerandoMsg] = useState(false)
  const [tipoMsg, setTipoMsg] = useState('conexao')
  const [msgGerada, setMsgGerada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [telefoneManual, setTelefoneManual] = useState('')
  const [mostrarInputFone, setMostrarInputFone] = useState(false)

  const [showHistorico, setShowHistorico] = useState(false)
  const [leadHistorico, setLeadHistorico] = useState(null)

  const [enriquecendo, setEnriquecendo] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { carregarLeads() }, [busca, filtroStatus, filtroTemp, filtroGrau, pagina])

  const carregarLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busca) params.set('search', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroTemp) params.set('temperature', filtroTemp)
      if (filtroGrau) params.set('connection_degree', filtroGrau)
      params.set('limit', LIMIT)
      params.set('page', pagina)
      const res = await api.get(`/api/leads?${params}`)
      setLeads(res.data.leads || [])
      setTotalLeads(res.data.pagination?.total || 0)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const showToast = (msg, tipo = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const exportarCSV = () => {
    const headers = ['Nome','Cargo','Empresa','Localização','Email','Telefone','LinkedIn','Grau','Temperatura','Status','Score','Interesse','Notas','Criado em']
    const rows = leads.map(l => [
      l.name, l.headline, l.company, l.location, l.email, l.phone,
      l.linkedin_url, l.connection_degree, l.temperature, l.status,
      l.score, l.service_interest, l.notes,
      new Date(l.created_at).toLocaleDateString('pt-BR')
    ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
    )
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('CSV exportado com sucesso!')
  }

  const salvarLead = async () => {
    if (!form.name.trim()) { showToast('Nome é obrigatório', 'error'); return }
    setSalvando(true)
    try {
      if (leadSel) await api.put(`/api/leads/${leadSel.id}`, form)
      else await api.post('/api/leads', form)
      setModal(false); resetForm(); carregarLeads()
      showToast(leadSel ? 'Lead atualizado!' : 'Lead criado!')
    } catch (err) { showToast('Erro ao salvar lead', 'error') }
    finally { setSalvando(false) }
  }

  const excluirLead = async (id, nome) => {
    if (!confirm(`Excluir ${nome}?`)) return
    setExcluindo(id)
    try {
      await api.delete(`/api/leads/${id}`)
      carregarLeads(); showToast('Lead excluído')
      if (modal) { setModal(false); resetForm() }
    } catch (err) { showToast('Erro ao excluir', 'error') }
    finally { setExcluindo(null) }
  }

  const enriquecerLead = async (id) => {
    setEnriquecendo(id)
    try {
      const res = await api.post(`/api/leads/${id}/enriquecer`)
      // Atualiza o form se o modal estiver aberto para este lead
      if (leadSel?.id === id && res.data?.lead) {
        const l = res.data.lead
        setForm(prev => ({
          ...prev,
          service_interest: l.service_interest || prev.service_interest,
          notes: l.notes || prev.notes,
        }))
      }
      carregarLeads()
      showToast('⚡ Lead enriquecido pela IA!')
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro desconhecido ao enriquecer'
      showToast('❌ ' + msg, 'error')
    }
    finally { setEnriquecendo(null) }
  }

  const atualizarStatus = async (id, status) => {
    try { await api.put(`/api/leads/${id}`, { status }); carregarLeads() } catch (err) { console.error(err) }
  }

  const gerarMensagem = async (lead, tipo) => {
    setLeadSel(lead); setMsgGerada(''); setGerandoMsg(true)
    const t = tipo || (lead.connection_degree === '1' ? 'primeiro_contato' : lead.connection_degree === '2' ? 'conexao_com_comum' : 'conexao')
    setTipoMsg(t)
    try {
      const res = await api.post(`/api/leads/${lead.id}/gerar-mensagem`, { tipo: t })
      setMsgGerada(res.data.mensagem)
    } catch (err) { setMsgGerada('Erro ao gerar mensagem. Verifique a chave da API.') }
    finally { setGerandoMsg(false) }
  }

  const enviarWhatsapp = async () => {
    if (!leadSel || !msgGerada) return
    const fone = leadSel.phone || form.phone || telefoneManual
    if (!fone) { setMostrarInputFone(true); return }
    setEnviando(true)
    try {
      await api.post(`/api/leads/${leadSel.id}/enviar-whatsapp`, { telefone: fone, mensagem: msgGerada })
      showToast('✅ Mensagem enviada via WhatsApp!')
      setMostrarInputFone(false); setTelefoneManual('')
      carregarLeads()
    } catch (err) { showToast('Erro: ' + (err.response?.data?.error || err.message), 'error') }
    finally { setEnviando(false) }
  }

  const resetForm = () => { setLeadSel(null); setMsgGerada(''); setMostrarInputFone(false); setTelefoneManual(''); setForm(FORM_EMPTY) }
  const abrirEditar = (lead) => {
    setLeadSel(lead)
    setForm({
      name: lead.name || '', headline: lead.headline || '', company: lead.company || '',
      location: lead.location || '', linkedin_url: lead.linkedin_url || '',
      email: lead.email || '', phone: lead.phone || '', website: lead.website || '',
      birthday: lead.birthday || '', connected_since: lead.connected_since || '',
      mutual_connections: lead.mutual_connections || '', about: lead.about || '',
      service_interest: lead.service_interest || '', temperature: lead.temperature || 'frio',
      notes: lead.notes || '', source: lead.source || 'manual', connection_degree: lead.connection_degree || '3'
    })
    setMsgGerada(lead.ai_message || '')
    // Auto-seleciona o tipo correto pelo grau de conexão
    setTipoMsg(lead.connection_degree === '1' ? 'primeiro_contato' : lead.connection_degree === '2' ? 'conexao_com_comum' : 'conexao')
    setMostrarInputFone(false); setTelefoneManual('')
    setModal(true)
  }

  const totalPaginas = Math.ceil(totalLeads / LIMIT)

  // ==========================================
  // ESTILOS — SAP-inspired toolbar
  // ==========================================
  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' },

    // SAP-style toolbar
    sapToolbar: {
      background: 'linear-gradient(180deg, #1a2535 0%, #0d1219 100%)',
      borderBottom: '2px solid var(--blue)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      height: '44px',
      flexShrink: 0,
    },
    sapTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginRight: '16px', letterSpacing: '-0.01em' },
    sapDivider: { width: '1px', height: '24px', background: 'var(--border)', margin: '0 6px' },
    sapBtn: (color = 'var(--text2)', active = false) => ({
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '5px 10px', height: '30px',
      background: active ? color + '20' : 'transparent',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      color: active ? color : 'var(--text2)',
      fontSize: '11px', fontWeight: '500', cursor: 'pointer',
      transition: 'all 0.12s', letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
    }),
    sapBtnIcon: { fontSize: '13px', lineHeight: 1 },
    sapCount: { fontSize: '11px', color: 'var(--text3)', marginLeft: 'auto', paddingLeft: '12px' },

    // Filtros
    filterBar: { padding: '8px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap', background: 'var(--bg2)' },
    input: { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', fontSize: '12px', outline: 'none', flex: 1, minWidth: '200px' },
    select: { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer' },

    // Tabela
    content: { padding: '16px 24px', flex: 1, overflow: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '2px solid var(--blue)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 1 },
    td: { padding: '8px 10px', fontSize: '12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },

    badge: (color) => ({ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', background: color + '18', border: `1px solid ${color}40`, color, fontSize: '10px', fontWeight: '700', borderRadius: '2px' }),

    // SAP-style row action buttons
    rowBtn: (color = 'var(--text2)') => ({
      padding: '3px 7px', border: `1px solid ${color}30`,
      background: 'transparent', color, fontSize: '10px',
      cursor: 'pointer', transition: 'all 0.1s', fontWeight: '500',
      letterSpacing: '0.02em',
    }),

    // Paginação
    pagination: { padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', background: 'var(--bg2)' },
    pageBtn: (active) => ({ padding: '4px 10px', border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`, background: active ? 'var(--blue)' : 'transparent', color: active ? '#fff' : 'var(--text2)', fontSize: '11px', cursor: 'pointer', fontWeight: active ? '700' : '400' }),

    // Modal
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' },
    modal: { background: 'var(--bg2)', border: '1px solid var(--border)', width: '680px', maxWidth: '96vw', maxHeight: '94vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' },

    // SAP-style modal toolbar
    modalToolbar: {
      padding: '0 22px', height: '44px',
      background: 'linear-gradient(180deg, #1a2535 0%, #0d1219 100%)',
      borderBottom: '2px solid var(--blue)',
      display: 'flex', alignItems: 'center', gap: '2px',
      position: 'sticky', top: 0, zIndex: 10,
    },
    modalTitle: { fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginRight: '12px' },

    modalBody: { padding: '20px 22px' },
    section: { fontSize: '10px', fontWeight: '700', color: 'var(--blue-bright)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px', marginTop: '18px', paddingBottom: '5px', borderBottom: '1px solid var(--border)' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    formRow3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
    formGroup: { marginBottom: '10px' },
    label: { display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' },
    formInput: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    formInputHighlight: { width: '100%', background: 'rgba(29,143,232,0.08)', border: '1px solid var(--blue)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none', resize: 'vertical', minHeight: '72px', fontFamily: 'var(--font)', boxSizing: 'border-box' },

    grauBtns: { display: 'flex', gap: '4px' },
    grauBtn: (active, color) => ({ padding: '6px 14px', border: `1px solid ${active ? color : 'var(--border)'}`, background: active ? color + '20' : 'transparent', color: active ? color : 'var(--text2)', fontSize: '11px', fontWeight: active ? '700' : '400', cursor: 'pointer', transition: 'all 0.1s' }),

    msgBox: { background: 'var(--bg)', border: '1px solid var(--blue)', padding: '12px', fontSize: '12px', color: 'var(--text)', lineHeight: '1.7', marginTop: '10px' },
    aiActions: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' },
    aiBtn: (color) => ({ padding: '6px 11px', background: 'transparent', border: `1px solid ${color}40`, color, fontSize: '11px', cursor: 'pointer', transition: 'all 0.1s', fontWeight: '500' }),

    // Phone input inline
    phoneAlert: { background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.4)', padding: '10px 12px', marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' },
    phoneAlertInput: { flex: 1, background: 'var(--bg3)', border: '1px solid var(--orange)', color: 'var(--text)', padding: '6px 10px', fontSize: '12px', outline: 'none' },

    empty: { padding: '60px', textAlign: 'center', color: 'var(--text3)' },
  }

  // Tipos de mensagem filtrados por grau de conexão
  const tiposMensagem = [
    { value: 'conexao',          label: '🔗 Conexão',    graus: ['2', '3'] },
    { value: 'conexao_com_comum', label: '👥 c/ Comum',   graus: ['2', '3'] },
    { value: 'primeiro_contato', label: '💬 1º Contato', graus: ['1', '2', '3'] },
    { value: 'follow_up',        label: '🔄 Follow-up',  graus: ['1', '2', '3'] },
    { value: 'whatsapp',         label: '📱 WhatsApp',   graus: ['1', '2', '3'] },
  ]
  const tiposParaLead = (lead) => tiposMensagem.filter(t => t.graus.includes(lead?.connection_degree || '3'))

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>

        {/* SAP-STYLE TOOLBAR */}
        <div style={S.sapToolbar}>
          <span style={S.sapTitle}>Leads</span>
          <div style={S.sapDivider} />

          <button style={S.sapBtn('var(--blue-bright)')} onClick={() => { resetForm(); setModal(true) }}>
            <span style={S.sapBtnIcon}>＋</span> Novo Lead
          </button>

          <button style={S.sapBtn()} onClick={carregarLeads}>
            <span style={S.sapBtnIcon}>↺</span> Atualizar
          </button>

          <div style={S.sapDivider} />

          <button style={S.sapBtn('var(--green)')} onClick={exportarCSV}>
            <span style={S.sapBtnIcon}>↓</span> Exportar CSV
          </button>

          <div style={S.sapDivider} />

          <button style={S.sapBtn()} onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroTemp(''); setFiltroGrau(''); setPagina(1) }}>
            <span style={S.sapBtnIcon}>✕</span> Limpar Filtros
          </button>

          <span style={S.sapCount}>
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''} &nbsp;|&nbsp; Pág. {pagina}/{totalPaginas || 1}
          </span>
        </div>

        {/* FILTROS */}
        <div style={S.filterBar}>
          <input style={S.input} placeholder="🔍 Buscar por nome, empresa ou cargo..." value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }} />
          <select style={S.select} value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1) }}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={S.select} value={filtroTemp} onChange={e => { setFiltroTemp(e.target.value); setPagina(1) }}>
            <option value="">Temperatura</option>
            <option value="quente">🔥 Quente</option>
            <option value="morno">⚡ Morno</option>
            <option value="frio">❄️ Frio</option>
          </select>
          <select style={S.select} value={filtroGrau} onChange={e => { setFiltroGrau(e.target.value); setPagina(1) }}>
            <option value="">Grau de Conexão</option>
            <option value="1">🟢 1º Grau</option>
            <option value="2">🔵 2º Grau</option>
            <option value="3">⚪ 3º Grau</option>
          </select>
        </div>

        {/* TABELA */}
        <div style={S.content}>
          {loading ? <div style={S.empty}>Carregando leads...</div> : leads.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>◈</div>
              Nenhum lead encontrado.
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {['Nome / Cargo','Empresa / Local','Contato','Grau','Score','Status','Temp.','Ações'].map(h =>
                    <th key={h} style={S.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={S.td}>
                      <div style={{ fontWeight: '600', fontSize: '12px' }}>{lead.name}</div>
                      {lead.headline && <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: '1px' }}>{lead.headline.substring(0, 50)}{lead.headline.length > 50 ? '…' : ''}</div>}
                    </td>
                    <td style={S.td}>
                      <div style={{ fontSize: '12px' }}>{lead.company || <span style={{ color: 'var(--text3)' }}>—</span>}</div>
                      {lead.location && <div style={{ fontSize: '10px', color: 'var(--text3)' }}>📍 {lead.location}</div>}
                    </td>
                    <td style={S.td}>
                      {lead.phone && <div style={{ fontSize: '11px', color: 'var(--text2)' }}>📱 {lead.phone}</div>}
                      {lead.email && <div style={{ fontSize: '10px', color: 'var(--text3)' }}>✉ {lead.email}</div>}
                      {!lead.phone && !lead.email && <span style={{ color: 'var(--text3)', fontSize: '10px' }}>Sem contato</span>}
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(GRAU[lead.connection_degree]?.color || '#8899aa')}>
                        {GRAU[lead.connection_degree]?.label || '—'} {GRAU[lead.connection_degree]?.desc}
                      </span>
                    </td>
                    <td style={S.td}>
                      {lead.score > 0 ? (
                        <span style={{ ...S.badge(lead.score >= 70 ? 'var(--green)' : lead.score >= 40 ? 'var(--orange)' : 'var(--text3)') }}>
                          {lead.score}
                        </span>
                      ) : <span style={{ color: 'var(--text3)', fontSize: '10px' }}>—</span>}
                    </td>
                    <td style={S.td}>
                      <select style={{ ...S.select, padding: '3px 6px', fontSize: '10px' }} value={lead.status} onChange={e => atualizarStatus(lead.id, e.target.value)}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(TEMP[lead.temperature]?.color || 'var(--text2)')}>
                        {TEMP[lead.temperature]?.label || lead.temperature}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                        <button style={S.rowBtn('var(--blue-bright)')} onClick={() => abrirEditar(lead)} title="Editar lead">✏ Editar</button>
                        <button style={S.rowBtn('var(--yellow)')} onClick={() => { setLeadSel(lead); setMsgGerada(''); gerarMensagem(lead) }} title="Gerar mensagem com IA">✦ IA</button>
                        <button style={S.rowBtn('var(--orange)')} onClick={() => enriquecerLead(lead.id)} disabled={enriquecendo === lead.id} title="Enriquecer com IA">
                          {enriquecendo === lead.id ? '⟳' : '⚡'}
                        </button>
                        {/* Botão captura contato — sempre aparece se tiver URL, para forçar atualização de perfil e contatos */}
                        {lead.linkedin_url && (
                          <button
                            style={S.rowBtn('var(--green)')}
                            title="Atualizar dados de perfil e contato no LinkedIn"
                            onClick={() => {
                              const url = `${lead.linkedin_url}?lp_action=capture_contacts&lp_lead_id=${lead.id}`
                              window.open(url, '_blank')
                              showToast('📞 Abrindo LinkedIn... A extensão vai atualizar os dados automaticamente!')
                            }}
                          >📞</button>
                        )}
                        <button style={S.rowBtn('var(--text2)')} onClick={() => { setLeadHistorico(lead); setShowHistorico(true) }} title="Histórico">📋</button>
                        {lead.linkedin_url && (
                          <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer">
                            <button style={S.rowBtn('#0a66c2')} title="Abrir no LinkedIn">in</button>
                          </a>
                        )}
                        <button style={S.rowBtn('var(--red)')} disabled={excluindo === lead.id} onClick={() => excluirLead(lead.id, lead.name)} title="Excluir">
                          {excluindo === lead.id ? '⟳' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINAÇÃO */}
        {totalPaginas > 1 && (
          <div style={S.pagination}>
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              Mostrando {((pagina - 1) * LIMIT) + 1}–{Math.min(pagina * LIMIT, totalLeads)} de {totalLeads} leads
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              <button style={S.pageBtn(false)} onClick={() => setPagina(1)} disabled={pagina === 1}>«</button>
              <button style={S.pageBtn(false)} onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>‹</button>
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPaginas - 4, pagina - 2)) + i
                return p <= totalPaginas ? (
                  <button key={p} style={S.pageBtn(p === pagina)} onClick={() => setPagina(p)}>{p}</button>
                ) : null
              })}
              <button style={S.pageBtn(false)} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>›</button>
              <button style={S.pageBtn(false)} onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '12px 20px', background: toast.tipo === 'error' ? 'rgba(255,59,92,0.95)' : 'rgba(0,200,150,0.95)', color: '#fff', fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: '360px', animation: 'fadeIn 0.2s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* MODAL IA RÁPIDA (fora da edição) */}
      {msgGerada !== '' && !modal && leadSel && (
        <div style={S.overlay} onClick={() => { setMsgGerada(''); setLeadSel(null) }}>
          <div style={{ ...S.modal, width: '540px' }} onClick={e => e.stopPropagation()}>
            <div style={S.modalToolbar}>
              <span style={S.modalTitle}>✦ IA — {leadSel?.name}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px' }}>
                <button style={S.sapBtn('var(--text2)')} onClick={() => { setMsgGerada(''); setLeadSel(null) }}>✕ Fechar</button>
              </div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              {/* Banner de contexto por grau */}
              {leadSel?.connection_degree === '1' && (
                <div style={{ fontSize: '11px', color: 'var(--green)', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', padding: '6px 10px', marginBottom: '10px' }}>
                  💬 Já são conectados — gere uma mensagem de 1º contato ou follow-up
                </div>
              )}
              {leadSel?.connection_degree === '2' && (
                <div style={{ fontSize: '11px', color: 'var(--blue-bright)', background: 'rgba(29,143,232,0.08)', border: '1px solid rgba(29,143,232,0.2)', padding: '6px 10px', marginBottom: '10px' }}>
                  👥 2º grau — mencione conexões em comum para maior conversão
                </div>
              )}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {tiposParaLead(leadSel).map(t => (
                  <button key={t.value} style={S.aiBtn(tipoMsg === t.value ? 'var(--blue-bright)' : 'var(--text3)')}
                    onClick={() => { setTipoMsg(t.value); gerarMensagem(leadSel, t.value) }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {gerandoMsg ? (
                <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text2)' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>✦</div>Gerando mensagem...
                </div>
              ) : (
                <>
                  <div style={S.msgBox}>{msgGerada}</div>
                  {mostrarInputFone && (
                    <div style={S.phoneAlert}>
                      <span style={{ fontSize: '11px', color: 'var(--orange)', whiteSpace: 'nowrap' }}>📱 Informe o telefone:</span>
                      <input style={S.phoneAlertInput} value={telefoneManual} onChange={e => setTelefoneManual(e.target.value)} placeholder="5541999999999" onKeyDown={e => e.key === 'Enter' && enviarWhatsapp()} autoFocus />
                      <button style={S.aiBtn('var(--green)')} onClick={enviarWhatsapp} disabled={!telefoneManual}>Enviar</button>
                    </div>
                  )}
                  <div style={S.aiActions}>
                    <button style={S.aiBtn('var(--text2)')} onClick={() => { navigator.clipboard.writeText(msgGerada); showToast('Copiado!') }}>📋 Copiar</button>
                    <button style={S.aiBtn('var(--green)')} onClick={enviarWhatsapp} disabled={enviando}>
                      {enviando ? '⟳ Enviando...' : leadSel?.phone ? `📱 WhatsApp (${leadSel.phone})` : '📱 Enviar WhatsApp'}
                    </button>
                    {leadSel?.linkedin_url && (
                      <button
                        style={S.aiBtn('#0a66c2')}
                        onClick={() => {
                          if (leadSel.connection_degree === '1') {
                            // URL direta de composição de mensagem — sem depender da extensão
                            navigator.clipboard.writeText(msgGerada)
                            const recipient = leadSel.linkedin_id || leadSel.linkedin_url.split('/in/')[1]?.replace(/\/$/, '')
                            const url = recipient
                              ? `https://www.linkedin.com/messaging/compose/?recipient=${recipient}`
                              : leadSel.linkedin_url
                            window.open(url, '_blank')
                            showToast('✅ Mensagem copiada! Cole no inbox que abrirá.')
                          } else {
                            // 2º/3º grau: extensão faz o clique em Conectar automaticamente
                            const url = `${leadSel.linkedin_url}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada)}`
                            window.open(url, '_blank')
                            showToast('✅ A extensão vai clicar em Conectar e preencher a nota!')
                          }
                        }}
                      >
                        {leadSel.connection_degree === '1' ? '💬 Abrir Inbox LinkedIn' : '🔗 Conectar no LinkedIn'}
                      </button>
                    )}
                    <button style={S.aiBtn('var(--blue-bright)')} onClick={() => gerarMensagem(leadSel, tipoMsg)} disabled={gerandoMsg}>🔄 Regenerar</button>
                  </div>

                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR */}
      {modal && (
        <div style={S.overlay} onClick={() => { setModal(false); resetForm() }}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>

            {/* SAP-style modal toolbar */}
            <div style={S.modalToolbar}>
              <span style={S.modalTitle}>{leadSel ? `✏ ${leadSel.name}` : '＋ Novo Lead'}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                {leadSel && (
                  <>
                    <button style={S.sapBtn('var(--yellow)')} onClick={() => gerarMensagem(leadSel, tipoMsg)} disabled={gerandoMsg}>
                      {gerandoMsg ? '⟳' : '✦'} IA
                    </button>
                    <button style={S.sapBtn('var(--orange)')} onClick={() => enriquecerLead(leadSel.id)} disabled={enriquecendo === leadSel?.id}>
                      ⚡ Enriquecer
                    </button>
                    <div style={S.sapDivider} />
                  </>
                )}
                <button style={S.sapBtn('var(--blue-bright)')} onClick={salvarLead} disabled={salvando}>
                  ✓ {salvando ? 'Salvando...' : 'Salvar'}
                </button>
                {leadSel && (
                  <button style={S.sapBtn('var(--red)')} onClick={() => excluirLead(leadSel.id, leadSel.name)}>🗑 Excluir</button>
                )}
                <button style={S.sapBtn()} onClick={() => { setModal(false); resetForm() }}>✕</button>
              </div>
            </div>

            <div style={S.modalBody}>
              {/* IDENTIFICAÇÃO */}
              <div style={S.section}>Identificação</div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Nome *</label>
                  <input style={S.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="João Silva" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Headline (Busca)</label>
                  <input style={S.formInput} value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Gerente de TI" />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={{ ...S.label, color: 'var(--green)' }}>Cargo Atual</label>
                  <input style={S.formInputHighlight} value={form.current_role} onChange={e => setForm({ ...form, current_role: e.target.value })} placeholder="Software Engineering Manager" />
                </div>
                <div style={S.formGroup}>
                  <label style={{ ...S.label, color: 'var(--green)' }}>Empresa Atual</label>
                  <input style={S.formInputHighlight} value={form.current_company} onChange={e => setForm({ ...form, current_company: e.target.value })} placeholder="IBM" />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Empresa</label>
                  <input style={form.company ? S.formInputHighlight : S.formInput} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Empresa Ltda" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Localização</label>
                  <input style={S.formInput} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Curitiba, PR, Brasil" />
                </div>
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>URL do LinkedIn</label>
                <input style={S.formInput} value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
              </div>

              {/* CONTATO */}
              <div style={S.section}>Informações de Contato</div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Email</label>
                  <input style={form.email ? S.formInputHighlight : S.formInput} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
                </div>
                <div style={S.formGroup}>
                  <label style={{ ...S.label, color: form.phone ? 'var(--green)' : 'var(--text3)' }}>
                    📱 Telefone / WhatsApp {form.phone && '✓'}
                  </label>
                  <input style={form.phone ? S.formInputHighlight : S.formInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(41) 99999-9999 ou 5541999999999" />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Website</label>
                  <input style={S.formInput} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://empresa.com.br" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Aniversário</label>
                  <input style={S.formInput} value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} placeholder="15 de março" />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Conectado desde</label>
                  <input style={S.formInput} value={form.connected_since} onChange={e => setForm({ ...form, connected_since: e.target.value })} placeholder="Janeiro 2024" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Conexões em comum</label>
                  <input style={S.formInput} value={form.mutual_connections} onChange={e => setForm({ ...form, mutual_connections: e.target.value })} placeholder="25 conexões em comum" />
                </div>
              </div>

              {/* QUALIFICAÇÃO */}
              <div style={S.section}>Qualificação</div>
              <div style={S.formGroup}>
                <label style={S.label}>Grau de Conexão</label>
                <div style={S.grauBtns}>
                  {Object.entries(GRAU).map(([k, v]) => (
                    <button key={k} style={S.grauBtn(form.connection_degree === k, v.color)}
                      onClick={() => setForm({ ...form, connection_degree: k, temperature: k === '1' ? 'quente' : k === '2' ? 'morno' : 'frio' })}>
                      {v.label} {v.desc}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Temperatura</label>
                  <select style={{ ...S.formInput, cursor: 'pointer' }} value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })}>
                    <option value="frio">❄️ Frio</option>
                    <option value="morno">⚡ Morno</option>
                    <option value="quente">🔥 Quente</option>
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Origem</label>
                  <select style={{ ...S.formInput, cursor: 'pointer' }} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                    <option value="manual">Manual</option>
                    <option value="chrome_extension">Extensão Chrome</option>
                    <option value="linkedin_login">LinkedIn Login</option>
                    <option value="importacao">Importação</option>
                  </select>
                </div>
              </div>

              {/* INTERESSE */}
              <div style={S.formGroup}>
                <label style={{ ...S.label, color: form.service_interest ? 'var(--yellow)' : 'var(--text3)' }}>
                  🎯 O que este lead precisa? {form.service_interest && '— preenchido pela IA'}
                </label>
                <input style={form.service_interest ? S.formInputHighlight : S.formInput} value={form.service_interest} onChange={e => setForm({ ...form, service_interest: e.target.value })} placeholder="Ex: Treinamento SAP MM / Consultoria go-live / Implementação BTP" />
              </div>

              {/* BIO */}
              <div style={S.formGroup}>
                <label style={S.label}>Sobre — Bio do LinkedIn</label>
                <textarea style={S.textarea} value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} placeholder="Resumo do perfil do LinkedIn..." />
              </div>

              {/* NOTAS */}
              <div style={S.formGroup}>
                <label style={{ ...S.label, color: form.notes ? 'var(--yellow)' : 'var(--text3)' }}>
                  📝 Notas Internas {form.notes && '— dicas da IA'}
                </label>
                <textarea style={{ ...S.textarea, minHeight: '90px' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="A IA sugere dicas estratégicas aqui. Clique em ⚡ Enriquecer para gerar." />
              </div>

              {/* MENSAGEM COM IA */}
              {leadSel && (
                <>
                  <div style={S.section}>✦ Mensagem com IA</div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {tiposParaLead(leadSel).map(t => (
                      <button key={t.value} style={S.aiBtn(tipoMsg === t.value ? 'var(--blue-bright)' : 'var(--text3)')}
                        onClick={() => setTipoMsg(t.value)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={S.aiActions}>
                    <button style={S.aiBtn('var(--yellow)')} onClick={() => gerarMensagem(leadSel, tipoMsg)} disabled={gerandoMsg}>
                      {gerandoMsg ? '⟳ Gerando...' : '✦ Gerar'}
                    </button>
                    {msgGerada && (
                      <>
                        <button style={S.aiBtn('var(--text2)')} onClick={() => { navigator.clipboard.writeText(msgGerada); showToast('Copiado!') }}>📋 Copiar</button>
                        <button style={S.aiBtn('var(--green)')} onClick={enviarWhatsapp} disabled={enviando}>
                          {enviando ? '⟳ Enviando...' : form.phone || leadSel.phone ? `📱 WhatsApp (${form.phone || leadSel.phone})` : '📱 Enviar WhatsApp'}
                        </button>
                        <button style={S.aiBtn('var(--blue-bright)')} onClick={() => gerarMensagem(leadSel, tipoMsg)} disabled={gerandoMsg}>🔄 Regenerar</button>
                      </>
                    )}
                  </div>
                  {msgGerada && <div style={S.msgBox}>{msgGerada}</div>}
                  {mostrarInputFone && (
                    <div style={S.phoneAlert}>
                      <span style={{ fontSize: '11px', color: 'var(--orange)', whiteSpace: 'nowrap' }}>📱 Telefone:</span>
                      <input style={S.phoneAlertInput} value={telefoneManual} onChange={e => setTelefoneManual(e.target.value)} placeholder="5541999999999" onKeyDown={e => e.key === 'Enter' && enviarWhatsapp()} autoFocus />
                      <button style={S.aiBtn('var(--green)')} onClick={enviarWhatsapp} disabled={!telefoneManual || enviando}>
                        {enviando ? '⟳' : 'Enviar'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {showHistorico && leadHistorico && (
        <LeadHistorico leadId={leadHistorico.id} onClose={() => { setShowHistorico(false); setLeadHistorico(null) }} />
      )}
    </div>
  )
}
