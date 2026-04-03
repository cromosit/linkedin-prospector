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
  '1': { label: '1º Amigo de amigo', color: '#00c896', desc: 'Conexão direta' },
  '2': { label: '2º Amigo de amigo', color: '#1d8fe8', desc: 'Amigo de amigo' },
  '3': { label: '3º Fora da rede', color: '#8899aa', desc: 'Fora da rede' }
}

const FORM_EMPTY = {
  name: '', headline: '', company: '', location: '',
  linkedin_url: '', email: '', phone: '', website: '',
  birthday: '', connected_since: '', mutual_connections: '',
  about: '', service_interest: '', temperature: 'frio',
  notes: '', source: 'manual', connection_degree: '3',
  current_role: '', current_company: '', instant_messaging: ''
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTemp, setFiltroTemp] = useState('')
  const [filtroGrau, setFiltroGrau] = useState('')
  const LIMIT = 20

  const [modal, setModal] = useState(false)
  const [leadSel, setLeadSel] = useState(null)
  const [form, setForm] = useState(FORM_EMPTY)
  const [salvando, setSalvando] = useState(false)
  const [gerandoMsg, setGerandoMsg] = useState(false)
  const [msgGerada, setMsgGerada] = useState('')
  const [toast, setToast] = useState(null)
  const [showAIAbordagem, setShowAIAbordagem] = useState(false)

  useEffect(() => { carregarLeads() }, [busca, pagina, filtroStatus, filtroTemp, filtroGrau])

  const carregarLeads = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (busca) p.set('search', busca)
      if (filtroStatus) p.set('status', filtroStatus)
      if (filtroTemp) p.set('temperature', filtroTemp)
      if (filtroGrau) p.set('connection_degree', filtroGrau)
      p.set('limit', LIMIT); p.set('page', pagina)
      const res = await api.get(`/api/leads?${p.toString()}`)
      setLeads(res.data.leads || [])
      setTotalLeads(res.data.pagination?.total || 0)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const salvarLead = async () => {
    setSalvando(true)
    try {
      if (leadSel) await api.put(`/api/leads/${leadSel.id}`, form)
      else await api.post('/api/leads', form)
      setModal(false); carregarLeads(); showToast('Sucesso!')
    } catch (err) { showToast('Erro ao salvar') }
    finally { setSalvando(false) }
  }

  const excluirLead = async (id, nome) => {
    if (!confirm(`Excluir ${nome}?`)) return
    try { await api.delete(`/api/leads/${id}`); carregarLeads(); showToast('Excluído') } 
    catch (err) { showToast('Erro ao excluir') }
  }

  const gerarMensagem = async (lead) => {
    setGerandoMsg(true); setShowAIAbordagem(true)
    try {
      const res = await api.post(`/api/leads/${lead.id}/gerar-mensagem`, { tipo: 'conexao' })
      setMsgGerada(res.data.mensagem)
    } catch (err) { setMsgGerada('Erro ao gerar abordagem.') }
    finally { setGerandoMsg(false) }
  }

  const abrirEditar = (lead) => {
    setLeadSel(lead)
    setForm({ ...FORM_EMPTY, ...lead })
    setMsgGerada(lead.ai_message || '')
    setShowAIAbordagem(false)
    setModal(true)
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main: { flex: 1, display: 'flex', flexDirection: 'column' },
    toolbar: { padding: '10px 25px', background: '#121922', borderBottom: '1px solid #233142', display: 'flex', alignItems: 'center', gap: '10px' },
    content: { padding: '20px 25px', flex: 1, overflow: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '10px', color: '#8899aa', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #233142' },
    td: { padding: '12px 10px', borderBottom: '1px solid #1c2633', fontSize: '13px' },
    badge: (color) => ({ padding: '3px 7px', background: color + '20', border: `1px solid ${color}40`, color, fontSize: '10px', borderRadius: '3px' }),
    btnRow: (color) => ({ background: 'transparent', border: 'none', color, cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }),
    
    // MODAL RESTAURAÇÃO FIEL (FOTO DELL)
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox: { background: '#121922', width: '850px', maxWidth: '96%', maxHeight: '94vh', overflow: 'auto', borderRadius: '4px', border: '1px solid #233142' },
    modalHeader: { padding: '12px 20px', borderBottom: '1px solid #233142', display: 'flex', alignItems: 'center', background: 'linear-gradient(180deg, #1a2535 0%, #0d1219 100%)' },
    sectionTitle: { color: '#1d8fe8', fontSize: '12px', fontWeight: '800', marginBottom: '15px', marginTop: '10px', textTransform: 'uppercase' },
    label: { color: '#8899aa', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', display: 'block', textTransform: 'uppercase' },
    labelGreen: { color: '#00c896', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', display: 'block', textTransform: 'uppercase' },
    input: { width: '100%', background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '8px 12px', borderRadius: '2px', fontSize: '13px', outline: 'none' },
    inputGreen: { width: '100%', background: 'rgba(0,200,150,0.05)', border: '1px solid #00c896', color: '#fff', padding: '8px 12px', borderRadius: '2px', fontSize: '13px' },
    
    // BOTÃO AZUL INTEGRADO PREMIUM
    rocketBtn: { padding: '6px 15px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '800', cursor: 'pointer', fontSize: '11px', marginRight: '6px' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        {/* TOOLBAR PRINCIPAL (FOTO 1) */}
        <div style={S.toolbar}>
          <h3 style={{ margin: 0, marginRight: '10px' }}>Leads</h3>
          <button style={{...S.btnRow('#1d8fe8'), padding:'6px 12px', background:'#121922', border:'1px solid #233142'}} onClick={() => { setLeadSel(null); setForm(FORM_EMPTY); setModal(true) }}>＋ Novo Lead</button>
          <button style={{...S.btnRow('#fff'), padding:'6px 12px'}} onClick={carregarLeads}>↺ Atualizar</button>
          <button style={{...S.btnRow('#fff'), padding:'6px 12px'}}>↓ Exportar CSV</button>
          <button style={{...S.btnRow('#fff'), padding:'6px 12px'}}>✕ Limpar Filtros</button>
          <span style={{marginLeft:'auto', fontSize:'11px', color:'#8899aa'}}>Total: {totalLeads} | Pág {pagina}</span>
        </div>

        {/* FILTROS INTEGRADOS */}
        <div style={{...S.toolbar, background:'#0d131b', padding:'5px 25px'}}>
          <input style={{...S.input, width:'200px', marginBottom:0}} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          <select style={{...S.input, width:'140px', marginBottom:0}} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
             <option value="">Status</option> {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{...S.input, width:'140px', marginBottom:0}} value={filtroTemp} onChange={e => setFiltroTemp(e.target.value)}>
             <option value="">Temperatura</option> {Object.entries(TEMP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* TABELA (FOTO 1) */}
        <div style={S.content}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}><input type="checkbox" /></th>
                <th style={S.th}>LEAD</th>
                <th style={S.th}>EMPRESA / LOCAL</th>
                <th style={S.th}>CONTATO</th>
                <th style={S.th}>GRAU</th>
                <th style={S.th}>SCORE</th>
                <th style={S.th}>STATUS</th>
                <th style={S.th}>TEMP.</th>
                <th style={S.th}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id}>
                  <td style={S.td}><input type="checkbox" /></td>
                  <td style={S.td}><b>{l.name}</b><br/><span style={{fontSize:'10px',color:'#8899aa'}}>{l.headline}</span></td>
                  <td style={S.td}>{l.company}<br/><span style={{fontSize:'10px',color:'#8899aa'}}>📍 {l.location}</span></td>
                  <td style={S.td}><span style={{fontSize:'11px'}}>✉ {l.email}</span><br/><span style={{fontSize:'11px'}}>📱 {l.phone}</span></td>
                  <td style={S.td}><span style={S.badge(GRAU[l.connection_degree]?.color)}>{GRAU[l.connection_degree]?.label}</span></td>
                  <td style={S.td}><span style={{color:'#00c896', fontWeight:'bold'}}>{l.score || 30}</span></td>
                  <td style={S.td}>
                    <select style={{...S.input, padding:'2px', fontSize:'11px', width:'90px'}} value={l.status} onChange={() => {}}>
                      {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td style={S.td}><span style={{color: TEMP[l.temperature]?.color || '#ff9f0a'}}>🔥 {TEMP[l.temperature]?.label || 'Morno'}</span></td>
                  <td style={S.td}>
                    <div style={{display:'flex', gap:'8px'}}>
                       <button style={S.btnRow('#1d8fe8')} onClick={() => abrirEditar(l)}>✏ Editar</button>
                       <button style={S.btnRow('var(--yellow)')} onClick={() => gerarMensagem(l)}>✦ IA</button>
                       <button style={S.btnRow('#00c896')}>📞</button>
                       <button style={S.btnRow('var(--red)')} onClick={() => excluirLead(l.id, l.name)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CORRIGIDO (FOTO 2) */}
      {modal && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <div style={S.modalHeader}>
              <span style={{fontWeight:'bold', fontSize:'14px'}}>✏ {form.name || 'Novo Lead'}</span>
              <div style={{marginLeft:'auto', display:'flex', alignItems:'center'}}>
                 { (leadSel?.linkedin_url || form.linkedin_url) && (
                   <button style={S.rocketBtn} onClick={() => {
                     const urlF = leadSel?.linkedin_url || form.linkedin_url;
                     const target = leadSel?.linkedin_id || urlF.split('/in/')[1]?.replace(/\/$/, '')
                     const degree = leadSel?.connection_degree || form.connection_degree
                     const action = degree === '1' ? 'send_message' : 'connect'
                     const url = degree === '1'
                       ? `https://www.linkedin.com/messaging/compose/?recipient=${target}&lp_action=send_message&lp_msg=${encodeURIComponent(msgGerada || 'Olá!')}`
                       : `${urlF}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada || 'Olá!')}`
                     window.open(url, '_blank')
                   }}>🚀 AUTOMATIZAR LINKEDIN</button>
                 )}
                 <button style={{...S.btnRow('var(--yellow)'), marginRight:'15px'}} onClick={() => gerarMensagem(leadSel || form)}>✦ IA</button>
                 <button style={{...S.btnRow('#ff9f0a'), marginRight:'15px'}} onClick={() => {}}>⚡ Enriquecer</button>
                 <button style={{...S.btnRow('#00c896'), marginRight:'15px'}} onClick={salvarLead}>✓ Salvar</button>
                 <button style={{...S.btnRow('var(--red)'), marginRight:'15px'}} onClick={() => excluirLead(leadSel.id, form.name)}>🗑 Excluir</button>
                 <button style={{...S.btnRow('#8899aa')}} onClick={() => setModal(false)}>✕</button>
              </div>
            </div>

            <div style={{padding:'20px'}}>
              <div style={S.sectionTitle}>IDENTIFICAÇÃO</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                 <div><label style={S.label}>NOME *</label><input style={S.input} value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></div>
                 <div><label style={S.label}>HEADLINE (BUSCA)</label><input style={S.input} value={form.headline} onChange={e => setForm({...form, headline:e.target.value})} /></div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                 <div><label style={S.labelGreen}>CARGO ATUAL</label><input style={S.inputGreen} value={form.current_role} onChange={e => setForm({...form, current_role:e.target.value})} /></div>
                 <div><label style={S.labelGreen}>EMPRESA ATUAL</label><input style={S.inputGreen} value={form.current_company} onChange={e => setForm({...form, current_company:e.target.value})} /></div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                 <div><label style={S.label}>EMPRESA</label><input style={S.input} value={form.company} onChange={e => setForm({...form, company:e.target.value})} /></div>
                 <div><label style={S.label}>LOCALIZAÇÃO</label><input style={S.input} value={form.location} onChange={e => setForm({...form, location:e.target.value})} /></div>
              </div>
              <div><label style={S.label}>URL DO LINKEDIN</label><input style={S.input} value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url:e.target.value})} /></div>

              <div style={S.sectionTitle}>INFORMAÇÕES DE CONTATO</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                 <div><label style={S.label}>EMAIL</label><input style={S.input} value={form.email} onChange={e => setForm({...form, email:e.target.value})} /></div>
                 <div><label style={S.label}>📱 TELEFONE / WHATSAPP</label><input style={S.input} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} /></div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                 <div><label style={S.label}>WEBSITE</label><input style={S.input} value={form.website} onChange={e => setForm({...form, website:e.target.value})} /></div>
                 <div><label style={S.label}>ANIVERSÁRIO</label><input style={S.input} value={form.birthday} onChange={e => setForm({...form, birthday:e.target.value})} /></div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                 <div><label style={S.label}>CONECTADO DESDE</label><input style={S.input} value={form.connected_since} onChange={e => setForm({...form, connected_since:e.target.value})} /></div>
                 <div><label style={S.label}>CONEXÕES EM COMUM</label><input style={S.input} value={form.mutual_connections} onChange={e => setForm({...form, mutual_connections:e.target.value})} /></div>
              </div>

              {showAIAbordagem && (
                <div style={{marginTop:'25px', padding:'15px', background:'rgba(29,143,232,0.1)', border:'1px solid #1d8fe8', borderRadius:'4px'}}>
                  <span style={{fontWeight:'bold', fontSize:'11px', color:'#1d8fe8'}}>✦ ABORDAGEM GERADA PELA IA</span>
                  <div style={{marginTop:'10px', fontSize:'14px', lineHeight:'1.6', whiteSpace:'pre-wrap'}}>{msgGerada || 'Gerando...'}</div>
                  <button style={{...S.btnRow('#1d8fe8'), marginTop:'10px'}} onClick={() => navigator.clipboard.writeText(msgGerada)}>📋 Copiar abordar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)', background:'#00c896', padding:'10px 25px', borderRadius:'4px', zIndex:9999}}>{toast}</div>}
    </div>
  )
}
