import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
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
  const version = '2.2.0-RESPONSIVE'
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

  const salvarLead = async () => {
    if (!form.name.trim()) { showToast('Nome é obrigatório', 'error'); return }
    setSalvando(true)
    try {
      if (leadSel) await api.put(`/api/leads/${leadSel.id}`, form)
      else await api.post('/api/leads', form)
      setModal(false); carregarLeads()
      showToast(leadSel ? 'Atualizado!' : 'Criado!')
    } catch (err) { showToast('Erro ao salvar', 'error') }
    finally { setSalvando(false) }
  }

  const excluirLead = async (id, nome) => {
    if (!confirm(`Excluir ${nome}?`)) return
    setExcluindo(id)
    try { await api.delete(`/api/leads/${id}`); carregarLeads(); showToast('Excluído') } 
    catch (err) { showToast('Erro ao excluir', 'error') }
    finally { setExcluindo(null) }
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

  const abrirEditar = (lead) => {
    setLeadSel(lead)
    setForm({ ...FORM_EMPTY, ...lead })
    setMsgGerada(lead.ai_message || '')
    setModal(true)
  }

  const totalPaginas = Math.ceil(totalLeads / LIMIT)

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    toolbar: { padding: '10px 24px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    title: { fontSize: '18px', fontWeight: '700', marginRight: '16px' },
    btn: (color = 'var(--text2)', active = false) => ({
      padding: '7px 14px', background: active ? color : 'var(--bg3)',
      border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
      color: active ? '#fff' : 'var(--text)', fontSize: '12px', fontWeight: '600',
      borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', gap: '6px'
    }),
    content: { padding: '24px', flex: 1, overflowY: 'auto' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' },
    th: { textAlign: 'left', padding: '12px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    tr: { background: 'var(--bg2)', transition: 'transform 0.2s, box-shadow 0.2s', borderRadius: '8px' },
    td: { padding: '14px 12px', fontSize: '13px' },
    badge: (color) => ({ padding: '3px 8px', background: color + '20', border: `1px solid ${color}40`, color, fontSize: '10px', fontWeight: '700', borderRadius: '4px', textTransform: 'uppercase' }),
    
    // Modal Responsivo
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
    modal: { background: 'var(--bg2)', border: '1px solid var(--border)', width: '800px', maxWidth: '95vw', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    modalHeader: { padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)' },
    modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
    
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
    label: { display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase' },
    input: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: '6px', fontSize: '14px', outline: 'none' },
    textarea: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: '6px', fontSize: '14px', minHeight: '100px', resize: 'vertical' },
    
    aiBox: { background: 'var(--bg3)', border: '1px solid var(--blue)', borderRadius: '8px', padding: '16px', marginTop: '20px' },
    aiText: { fontSize: '14px', lineHeight: '1.6', color: 'var(--text)', whiteSpace: 'pre-wrap' },
    
    // Botão de Automação Estilizado
    rocketBtn: {
      padding: '10px 20px', background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)',
      color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700',
      fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
      boxShadow: '0 4px 15px rgba(10,102,194,0.3)', transition: 'transform 0.2s'
    }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        {/* TOOLBAR */}
        <div style={S.toolbar}>
          <span style={S.title}>Prospector CRM</span>
          <button style={S.btn('var(--blue-bright)', true)} onClick={() => { setForm(FORM_EMPTY); setLeadSel(null); setModal(true) }}>＋ Adicionar Lead</button>
          <button style={S.btn()} onClick={carregarLeads}>↺ Sincronizar</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{totalLeads} Leads</span>
          </div>
        </div>

        {/* LISTA DE LEADS (Tabela Responsiva) */}
        <div style={S.content}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Informações do Lead</th>
                <th style={S.th}>Empresa</th>
                <th style={S.th}>Grau</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Ações de Venda</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} style={S.tr}>
                  <td style={S.td}>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{l.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{l.headline}</div>
                  </td>
                  <td style={S.td}>{l.company || '—'}</td>
                  <td style={S.td}><span style={S.badge(GRAU[l.connection_degree]?.color)}>{GRAU[l.connection_degree]?.label} Grau</span></td>
                  <td style={S.td}>
                    <select style={{ ...S.input, padding: '4px', width: 'auto' }} value={l.status} onChange={e => {}}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={S.btn('var(--blue-bright)')} onClick={() => abrirEditar(l)}>✏ Editar</button>
                      <button style={S.btn('var(--yellow)')} onClick={() => gerarMensagem(l)}>✦ IA</button>
                      <button style={S.btn('var(--red)')} onClick={() => excluirLead(l.id, l.name)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO E IA (Unificado) */}
      {modal && (
        <div style={S.overlay} onClick={() => setModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>{leadSel ? Nelson : 'Novo Lead'}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.rocketBtn} onClick={() => {
                   const recipient = leadSel?.linkedin_id || form.linkedin_url?.split('/in/')[1]?.replace(/\/$/, '')
                   const degree = leadSel?.connection_degree || form.connection_degree
                   const action = degree === '1' ? 'send_message' : 'connect'
                   const url = degree === '1'
                     ? `https://www.linkedin.com/messaging/compose/?recipient=${recipient}&lp_action=send_message&lp_msg=${encodeURIComponent(msgGerada || 'Olá!')}`
                     : `${leadSel?.linkedin_url || form.linkedin_url}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada || 'Olá!')}`
                   window.open(url, '_blank')
                }}>🚀 AUTOMATIZAR LINKEDIN</button>
                <button style={S.btn('var(--green)', true)} onClick={salvarLead}>Salvar Alterações</button>
                <button style={S.btn()} onClick={() => setModal(false)}>✕</button>
              </div>
            </div>

            <div style={S.modalBody}>
               <div style={S.formGrid}>
                  <div>
                    <label style={S.label}>Nome Completo</label>
                    <input style={S.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={S.label}>LinkedIn URL</label>
                    <input style={S.input} value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url: e.target.value})} />
                  </div>
                  <div>
                    <label style={S.label}>Cargo / Headline</label>
                    <input style={S.input} value={form.headline} onChange={e => setForm({...form, headline: e.target.value})} />
                  </div>
                  <div>
                    <label style={S.label}>Empresa</label>
                    <input style={S.input} value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
                  </div>
                  <div>
                    <label style={S.label}>Email Direto</label>
                    <input style={S.input} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label style={S.label}>Telefone / WhatsApp</label>
                    <input style={S.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div>
                    <label style={S.label}>Skype / Mensagem Inst.</label>
                    <input style={S.input} value={form.instant_messaging} onChange={e => setForm({...form, instant_messaging: e.target.value})} />
                  </div>
               </div>

               <div style={{ marginTop: '24px' }}>
                  <label style={S.label}>✦ Sugestão de Mensagem da IA</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button style={S.btn('var(--blue-bright)')} onClick={() => gerarMensagem(leadSel || form)}>Gerar Nova Mensagem</button>
                    <button style={S.btn()} onClick={() => navigator.clipboard.writeText(msgGerada)}>Copiar Texto</button>
                  </div>
                  <div style={S.aiBox}>
                    <div style={S.aiText}>{msgGerada || 'Clique em "Gerar" para criar uma abordagem personalizada para este lead.'}</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--green)', color: '#fff', padding: '12px 24px', borderRadius: '8px', zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  )
}
