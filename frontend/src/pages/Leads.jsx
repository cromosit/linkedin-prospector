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
  notes: '', source: 'manual', connection_degree: '3',
  instant_messaging: ''
}

export default function Leads() {
  const version = '2.1.0' // Versão final com automação e UI restaurada
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
  const [selectedIds, setSelectedIds] = useState([]) 

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
      setSelectedIds(prev => prev.filter(i => i !== id))
    } catch (err) { showToast('Erro ao excluir', 'error') }
    finally { setExcluindo(null) }
  }

  const excluirEmMassa = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Excluir ${selectedIds.length} lead(s) selecionados?`)) return
    setLoading(true)
    try {
      await api.delete('/api/leads/bulk-delete', { data: { ids: selectedIds } })
      setSelectedIds([])
      carregarLeads()
      showToast(`${selectedIds.length} leads excluídos!`)
    } catch (err) {
      showToast('Erro ao excluir em massa', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) setSelectedIds([])
    else setSelectedIds(leads.map(l => l.id))
  }

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const enriquecerLead = async (id) => {
    setEnriquecendo(id)
    try {
      const res = await api.post(`/api/leads/${id}/enriquecer`)
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
      showToast('❌ Erro ao enriquecer', 'error')
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
    } catch (err) { setMsgGerada('Erro ao gerar mensagem.') }
    finally { setGerandoMsg(false) }
  }

  const enviarWhatsapp = async () => {
    if (!leadSel || !msgGerada) return
    const fone = leadSel.phone || form.phone || telefoneManual
    if (!fone) { setMostrarInputFone(true); return }
    setEnviando(true)
    try {
      await api.post(`/api/leads/${leadSel.id}/enviar-whatsapp`, { telefone: fone, mensagem: msgGerada })
      showToast('✅ Enviada via WhatsApp!')
      setMostrarInputFone(false); setTelefoneManual('')
      carregarLeads()
    } catch (err) { showToast('Erro no WhatsApp', 'error') }
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
      notes: lead.notes || '', source: lead.source || 'manual', connection_degree: lead.connection_degree || '3',
      instant_messaging: lead.instant_messaging || ''
    })
    setMsgGerada(lead.ai_message || '')
    setTipoMsg(lead.connection_degree === '1' ? 'primeiro_contato' : lead.connection_degree === '2' ? 'conexao_com_comum' : 'conexao')
    setMostrarInputFone(false); setTelefoneManual('')
    setModal(true)
  }

  const totalPaginas = Math.ceil(totalLeads / LIMIT)

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' },
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
    sapTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginRight: '16px' },
    sapDivider: { width: '1px', height: '24px', background: 'var(--border)', margin: '0 6px' },
    sapBtn: (color = 'var(--text2)', active = false) => ({
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '5px 10px', height: '30px',
      background: active ? color + '20' : 'transparent',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      color: active ? color : 'var(--text2)',
      fontSize: '11px', fontWeight: '500', cursor: 'pointer',
      transition: 'all 0.12s',
    }),
    filterBar: { padding: '8px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap', background: 'var(--bg2)' },
    input: { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', fontSize: '12px', outline: 'none', flex: 1, minWidth: '200px' },
    select: { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer' },
    content: { padding: '16px 24px', flex: 1, overflow: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '2px solid var(--blue)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 1 },
    td: { padding: '8px 10px', fontSize: '12px', borderBottom: '1px solid var(--border)' },
    badge: (color) => ({ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', background: color + '18', border: `1px solid ${color}40`, color, fontSize: '10px', fontWeight: '700', borderRadius: '2px' }),
    rowBtn: (color = 'var(--text2)') => ({ padding: '3px 7px', border: `1px solid ${color}30`, background: 'transparent', color, fontSize: '10px', cursor: 'pointer', fontWeight: '500' }),
    pagination: { padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', background: 'var(--bg2)' },
    pageBtn: (active) => ({ padding: '4px 10px', border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`, background: active ? 'var(--blue)' : 'transparent', color: active ? '#fff' : 'var(--text2)', fontSize: '11px', cursor: 'pointer' }),
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' },
    modalBase: { background: 'var(--bg2)', border: '1px solid var(--border)', width: '680px', maxWidth: '96vw', maxHeight: '94vh', overflow: 'auto' },
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
    formGroup: { marginBottom: '10px' },
    label: { display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '3px' },
    formInput: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    formInputHighlight: { width: '100%', background: 'rgba(29,143,232,0.08)', border: '1px solid var(--blue)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none', resize: 'vertical', minHeight: '72px', boxSizing: 'border-box' },
    aiBtn: (color) => ({ padding: '6px 11px', background: 'transparent', border: `1px solid ${color}40`, color, fontSize: '11px', cursor: 'pointer', fontWeight: '500' }),
    msgBox: { background: 'var(--bg)', border: '1px solid var(--blue)', padding: '12px', fontSize: '12px', color: 'var(--text)', lineHeight: '1.7', marginTop: '10px' },
    empty: { padding: '60px', textAlign: 'center', color: 'var(--text3)' },
  }

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
        {/* TOOLBAR PRINCIPAL */}
        <div style={S.sapToolbar}>
          <span style={S.sapTitle}>Leads</span>
          <div style={S.sapDivider} />
          <button style={S.sapBtn('var(--blue-bright)')} onClick={() => { resetForm(); setModal(true) }}>＋ Novo Lead</button>
          <button style={S.sapBtn()} onClick={carregarLeads}>↺ Atualizar</button>
          <div style={S.sapDivider} />
          <button style={S.sapBtn('var(--green)')} onClick={exportarCSV}>↓ Exportar CSV</button>
          <div style={S.sapDivider} />
          <button style={S.sapBtn()} onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroTemp(''); setFiltroGrau(''); setPagina(1) }}>✕ Limpar</button>
          {selectedIds.length > 0 && <button style={S.sapBtn('var(--red)', true)} onClick={excluirEmMassa}>🗑 Excluir ({selectedIds.length})</button>}
          <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: 'auto' }}>{totalLeads} leads | Pág. {pagina}/{totalPaginas || 1}</span>
        </div>

        {/* FILTROS */}
        <div style={S.filterBar}>
          <input style={S.input} placeholder="🔍 Buscar..." value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }} />
          <select style={S.select} value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1) }}>
            <option value="">Status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={S.select} value={filtroTemp} onChange={e => { setFiltroTemp(e.target.value); setPagina(1) }}>
            <option value="">Temp.</option>
            <option value="quente">🔥 Quente</option>
            <option value="morno">⚡ Morno</option>
            <option value="frio">❄️ Frio</option>
          </select>
        </div>

        {/* TABELA DE LEADS */}
        <div style={S.content}>
          {loading ? <div style={S.empty}>Carregando...</div> : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: '30px' }}><input type="checkbox" checked={leads.length > 0 && selectedIds.length === leads.length} onChange={toggleSelectAll} /></th>
                  <th style={S.th}>Nome / Cargo</th>
                  <th style={S.th}>Empresa</th>
                  <th style={S.th}>Grau</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id}>
                    <td style={S.td}><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} /></td>
                    <td style={S.td}><div style={{ fontWeight: 600 }}>{lead.name}</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>{lead.headline}</div></td>
                    <td style={S.td}>{lead.company}</td>
                    <td style={S.td}><span style={S.badge(GRAU[lead.connection_degree]?.color)}>{GRAU[lead.connection_degree]?.label}</span></td>
                    <td style={S.td}>
                      <select style={{ ...S.select, padding: '3px', fontSize: '10px' }} value={lead.status} onChange={e => atualizarStatus(lead.id, e.target.value)}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button style={S.rowBtn('var(--blue-bright)')} onClick={() => abrirEditar(lead)}>✏</button>
                        <button style={S.rowBtn('var(--yellow)')} onClick={() => gerarMensagem(lead)}>✦ IA</button>
                        <button style={S.rowBtn('var(--orange)')} onClick={() => enriquecerLead(lead.id)}>⚡</button>
                        <button style={S.rowBtn('var(--red)')} onClick={() => excluirLead(lead.id, lead.name)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL IA RÁPIDA (O Botão Azul está aqui também!) */}
      {msgGerada !== '' && !modal && leadSel && (
        <div style={S.overlay} onClick={() => { setMsgGerada(''); setLeadSel(null) }}>
          <div style={{ ...S.modalBase, width: '540px' }} onClick={e => e.stopPropagation()}>
            <div style={S.modalToolbar}>
              <span style={S.modalTitle}>✦ IA — {leadSel.name}</span>
              <button style={S.sapBtn()} onClick={() => { setMsgGerada(''); setLeadSel(null) }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
               <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {tiposParaLead(leadSel).map(t => (
                  <button key={t.value} style={S.aiBtn(tipoMsg === t.value ? 'var(--blue-bright)' : 'var(--text3)')}
                    onClick={() => { setTipoMsg(t.value); gerarMensagem(leadSel, t.value) }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={S.msgBox}>{msgGerada}</div>
              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                <button style={S.aiBtn('var(--text2)')} onClick={() => { navigator.clipboard.writeText(msgGerada); showToast('Copiado!') }}>📋 Copiar</button>
                <button style={S.aiBtn('var(--green)')} onClick={enviarWhatsapp}>📱 WhatsApp</button>
                <button style={S.aiBtn('#0a66c2')} onClick={() => {
                   const recipient = leadSel.linkedin_id || leadSel.linkedin_url?.split('/in/')[1]?.replace(/\/$/, '')
                   const degree = leadSel.connection_degree
                   const action = degree === '1' ? 'send_message' : 'connect'
                   const url = degree === '1'
                     ? `https://www.linkedin.com/messaging/compose/?recipient=${recipient}&lp_action=send_message&lp_msg=${encodeURIComponent(msgGerada)}`
                     : `${leadSel.linkedin_url}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada)}`
                   window.open(url, '_blank')
                   showToast('🚀 Abrindo LinkedIn... Automação iniciada!')
                }}>💬 ENVIAR AUTOMATIZADO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR LEAD COMPLETÃO */}
      {modal && (
        <div style={S.overlay} onClick={() => { setModal(false); resetForm() }}>
          <div style={S.modalBase} onClick={e => e.stopPropagation()}>
            <div style={S.modalToolbar}>
              <span style={S.modalTitle}>{leadSel ? `✏ ${leadSel.name}` : '＋ Novo Lead'}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px' }}>
                 {(leadSel?.linkedin_url || form.linkedin_url) && (
                  <button style={S.sapBtn('#0a66c2', true)} onClick={() => {
                    const urlFinal = leadSel?.linkedin_url || form.linkedin_url;
                    const recipient = leadSel?.linkedin_id || urlFinal.split('/in/')[1]?.replace(/\/$/, '')
                    const degree = leadSel?.connection_degree || form.connection_degree
                    const action = degree === '1' ? 'send_message' : 'connect'
                    const url = degree === '1'
                      ? `https://www.linkedin.com/messaging/compose/?recipient=${recipient}&lp_action=send_message&lp_msg=${encodeURIComponent(msgGerada || 'Olá!')}`
                      : `${urlFinal}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada || 'Olá!')}`
                    window.open(url, '_blank')
                  }}>💬 AUTOMATIZAR LINKEDIN</button>
                )}
                <button style={S.sapBtn('var(--blue-bright)', true)} onClick={salvarLead}>💾 Salvar</button>
                <button style={S.sapBtn()} onClick={() => { setModal(false); resetForm() }}>✕</button>
              </div>
            </div>
            <div style={S.modalBody}>
               <div style={S.section}>Identificação</div>
               <div style={S.formRow}>
                  <div style={S.formGroup}><label style={S.label}>Nome</label><input style={S.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div style={S.formGroup}><label style={S.label}>Cargo</label><input style={S.formInput} value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} /></div>
               </div>
               <div style={S.formGroup}><label style={S.label}>LinkedIn URL</label><input style={S.formInput} value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} /></div>
               
               <div style={S.section}>Contato</div>
               <div style={S.formRow}>
                  <div style={S.formGroup}><label style={S.label}>Email</label><input style={S.formInput} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div style={S.formGroup}><label style={S.label}>Telefone</label><input style={S.formInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
               </div>
               <div style={S.formGroup}><label style={S.label}>Mensagem Instantânea (Skype/etc)</label><input style={S.formInput} value={form.instant_messaging} onChange={e => setForm({ ...form, instant_messaging: e.target.value })} /></div>

               <div style={S.section}>Qualificação</div>
               <div style={S.formRow}>
                  <div style={S.formGroup}><label style={S.label}>Grau</label>
                    <select style={S.formInput} value={form.connection_degree} onChange={e => setForm({ ...form, connection_degree: e.target.value })}>
                      <option value="1">1º Grau</option><option value="2">2º Grau</option><option value="3">3º Grau</option>
                    </select>
                  </div>
                  <div style={S.formGroup}><label style={S.label}>Status</label>
                    <select style={S.formInput} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
               </div>
               <textarea style={{ ...S.textarea, marginTop: '10px' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas..." />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
