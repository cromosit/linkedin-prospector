import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

// CONFIGURAÇÃO DE CORES E LABELS (ESTILO PREMIUM NÉON)
const STATUS = {
  novo: { label: 'Novo', color: 'var(--blue-bright)' },
  contatado: { label: 'Contatado', color: 'var(--yellow)' },
  respondeu: { label: 'Respondeu', color: 'var(--orange)' },
  em_negociacao: { label: 'Negociando', color: 'var(--orange)' },
  fechado: { label: 'Fechado', color: 'var(--green)' },
  descartado: { label: 'Descartado', color: 'var(--red)' }
}
const GRAU = {
  '1': { label: '1º Amigo', color: '#00c896' },
  '2': { label: '2º Amigo de amigo', color: '#1d8fe8' },
  '3': { label: '3º Fora da rede', color: '#8899aa' }
}

const FORM_EMPTY = {
  name: '', headline: '', company: '', location: '',
  linkedin_url: '', email: '', phone: '', website: '',
  birthday: '', connected_since: '', mutual_connections: '',
  about: '', service_interest: '', temperature: 'morno',
  notes: '', source: 'manual', connection_degree: '3',
  current_role: '', current_company: '', instant_messaging: '',
  score: 30, status: 'novo'
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const LIMIT = 20

  const [modal, setModal] = useState(false)
  const [leadSel, setLeadSel] = useState(null)
  const [form, setForm] = useState(FORM_EMPTY)
  const [salvando, setSalvando] = useState(false)
  const [gerandoMsg, setGerandoMsg] = useState(false)
  const [tipoMsg, setTipoMsg] = useState('conexao')
  const [msgGerada, setMsgGerada] = useState('')
  const [enriquecendo, setEnriquecendo] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { carregarLeads() }, [busca, pagina])

  const carregarLeads = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/leads?search=${busca}&limit=${LIMIT}&page=${pagina}`)
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

  const excluirLead = async () => {
    if (!leadSel || !window.confirm('Excluir este lead?')) return
    try {
      await api.delete(`/api/leads/${leadSel.id}`)
      setModal(false); carregarLeads(); showToast('Lead excluído')
    } catch (err) { showToast('Erro ao excluir') }
  }

  const gerarAbordagem = async (tipo) => {
    setGerandoMsg(true); setTipoMsg(tipo)
    try {
      const id = leadSel?.id || form.id
      const res = await api.post(`/api/leads/${id}/gerar-mensagem`, { tipo })
      setMsgGerada(res.data.mensagem)
    } catch (err) { setMsgGerada('Erro ao gerar abordagem.') }
    finally { setGerandoMsg(false) }
  }

  const enriquecerLead = async () => {
    setEnriquecendo(true)
    try {
      const res = await api.post(`/api/leads/${leadSel.id}/enriquecer`)
      setForm({ ...form, ...res.data.lead })
      showToast('⚡ Lead Enriquecido!')
    } catch (err) { showToast('Erro no enriquecimento') }
    finally { setEnriquecendo(false) }
  }

  const abrirEditar = (lead) => {
    setLeadSel(lead)
    setForm({ ...FORM_EMPTY, ...lead })
    setMsgGerada(lead.ai_message || '')
    setModal(true)
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main: { flex: 1, display: 'flex', flexDirection: 'column' },
    toolbar: { padding: '10px 25px', background: '#121922', borderBottom: '1px solid #233142', display: 'flex', alignItems: 'center', gap: '15px' },
    content: { padding: '20px 25px', flex: 1, overflow: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', color: '#8899aa', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid #233142' },
    td: { padding: '14px 12px', borderBottom: '1px solid #1c2633', fontSize: '13px' },
    badge: (color) => ({ padding: '3px 7px', background: color + '15', border: `1px solid ${color}40`, color, fontSize: '10px', borderRadius: '3px' }),
    btnRow: (color) => ({ background: 'transparent', border: 'none', color, cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }),
    
    // MODAL PREMIUM (FOTO DO NELSON)
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox: { background: '#0d131b', width: '900px', maxWidth: '96%', maxHeight: '94vh', overflow: 'auto', borderRadius: '4px', border: '1px solid #1d8fe840' },
    modalHeader: { padding: '12px 25px', borderBottom: '1px solid #1d8fe8', display: 'flex', alignItems: 'center', background: '#121922' },
    headerBtn: (color, bg) => ({ padding: '5px 12px', background: bg || '#1c2633', border: '1px solid #233142', color, borderRadius:'3px', fontSize:'11px', cursor:'pointer' }),
    
    // SEÇÕES (AZUL/AMARELO NÉON)
    sectionTitle: (color) => ({ color: color || '#1d8fe8', fontSize: '11px', fontWeight: '800', marginBottom: '15px', marginTop: '20px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }),
    input: { width: '100%', background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '10px 14px', borderRadius: '2px', fontSize: '13px', outline: 'none' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.toolbar}>
           <h3 style={{ margin: 0 }}>Leads ({totalLeads})</h3>
           <button style={S.btnRow('#1d8fe8')} onClick={() => { setLeadSel(null); setForm(FORM_EMPTY); setModal(true) }}>＋ Novo Lead</button>
           <input style={{...S.input, width:'300px', marginBottom:0}} placeholder="Pesquise por nome, empresa ou cargo..." value={busca} onChange={e => setBusca(e.target.value)} />
           <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'10px'}}>
              <span style={{fontSize:'12px', color:'#00c896'}}>● API online · Railway</span>
           </div>
        </div>

        <div style={S.content}>
          <table style={S.table}>
             <thead>
                <tr>
                   <th style={S.th}>LEAD</th>
                   <th style={S.th}>EMPRESA / LOCAL</th>
                   <th style={S.th}>GRAU</th>
                   <th style={S.th}>STATUS</th>
                   <th style={S.th}>AÇÕES</th>
                </tr>
             </thead>
             <tbody>
                {leads.map(l => (
                  <tr key={l.id}>
                    <td style={S.td}><b>{l.name}</b><br/><span style={{fontSize:'10px', color:'#8899aa'}}>{l.headline}</span></td>
                    <td style={S.td}>{l.company}<br/><span style={{fontSize:'11px', color:'#8899aa'}}>📍 {l.location}</span></td>
                    <td style={S.td}><span style={S.badge(GRAU[l.connection_degree]?.color)}>{GRAU[l.connection_degree]?.label}</span></td>
                    <td style={S.td}>
                       <select style={{...S.input, width:'120px', padding:'3px'}} value={l.status} onChange={() => {}}>
                          {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                       </select>
                    </td>
                    <td style={S.td}>
                       <button style={S.btnRow('#1d8fe8')} onClick={() => abrirEditar(l)}>✏ Editar / IA</button>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div style={S.modal}>
          <div style={S.modalBox}>
             <div style={S.modalHeader}>
                <span style={{fontWeight:'bold', fontSize:'15px'}}>🏛️ {form.name || 'Novo Lead'}</span>
                <div style={{marginLeft:'auto', display:'flex', gap:'10px'}}>
                   <button style={S.headerBtn('#fff')} onClick={() => gerarAbordagem(tipoMsg)}>✦ IA</button>
                   <button style={S.headerBtn('#ff9f0a')} onClick={enriquecerLead} disabled={enriquecendo || !leadSel}>⚡ Enriquecer</button>
                   <button style={S.headerBtn('#00c896')} onClick={salvarLead}>✓ Salvar</button>
                   <button style={S.headerBtn('#8899aa')} onClick={excluirLead}>🗑 Excluir</button>
                   <button style={S.headerBtn('#fff', 'transparent')} onClick={() => setModal(false)}>✕</button>
                </div>
             </div>

             <div style={{padding:'20px 30px'}}>
                {/* IDENTIFICAÇÃO (AZUL NÉON - IGUAL FOTO ROGERIO) */}
                <div style={S.sectionTitle()}>IDENTIFICAÇÃO</div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginBottom:'20px'}}>
                   <div><label style={{color:'#8899aa', fontSize:'10px', fontWeight:'bold'}}>NOME</label><input style={S.input} value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></div>
                   <div><label style={{color:'#8899aa', fontSize:'10px', fontWeight:'bold'}}>HEADLINE</label><input style={S.input} value={form.headline} onChange={e => setForm({...form, headline:e.target.value})} /></div>
                   <div><label style={{color:'#8899aa', fontSize:'10px', fontWeight:'bold', color:'#00c896'}}>CARGO ATUAL</label><input style={{...S.input, border:'1px solid #00c89640'}} value={form.current_role} onChange={e => setForm({...form, current_role:e.target.value})} /></div>
                   <div><label style={{color:'#8899aa', fontSize:'10px', fontWeight:'bold', color:'#00c896'}}>EMPRESA ATUAL</label><input style={{...S.input, border:'1px solid #00c89640'}} value={form.current_company} onChange={e => setForm({...form, current_company:e.target.value})} /></div>
                </div>

                {/* INFORMAÇÕES DE CONTATO (AZUL NÉON) */}
                <div style={S.sectionTitle()}>INFORMAÇÕES DE CONTATO (EXTRAÍDOS DO LINKEDIN)</div>
                <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr 1.2fr', gap:'15px', marginBottom:'20px'}}>
                   <div><label style={{color:'#8899aa', fontSize:'10px', fontWeight:'bold'}}>LINKEDIN URL</label><input style={S.input} value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url:e.target.value})} /></div>
                   <div><label style={{color:'#8899aa', fontSize:'10px', fontWeight:'bold'}}>E-MAIL</label><input style={S.input} value={form.email} onChange={e => setForm({...form, email:e.target.value})} /></div>
                   <div><label style={{color:'#8899aa', fontSize:'10px', fontWeight:'bold'}}>SITE / WEB</label><input style={S.input} value={form.website} onChange={e => setForm({...form, website:e.target.value})} /></div>
                </div>

                <div style={S.sectionTitle('#ff9f0a')}>🎯 O QUE ESTE LEAD PRECISA? — PREENCHIDO PELA IA</div>
                <textarea style={{...S.input, height:'50px', border:'1px solid #ff9f0a40'}} value={form.service_interest} onChange={e => setForm({...form, service_interest:e.target.value})} />

                <div style={S.sectionTitle()}>SOBRE — BIO DO LINKEDIN</div>
                <textarea style={{...S.input, height:'70px'}} value={form.about} onChange={e => setForm({...form, about:e.target.value})} />

                <div style={S.sectionTitle('#ff9f0a')}>📑 NOTAS INTERNAS — DICAS DA IA</div>
                <textarea style={{...S.input, height:'90px', border:'1px solid #ff3b5c40'}} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} />

                <div style={S.sectionTitle()}>✦ MENSAGEM COM IA (VENDEDOR PROFISSIONAL)</div>
                <div style={{display:'flex', gap:'20px', fontSize:'11px', color:'#8899aa', marginBottom:'15px'}}>
                   {['conexao', 'conexao_com_comum', 'primeiro_contato', 'follow_up', 'whatsapp'].map(t => (
                     <span key={t} onClick={() => setTipoMsg(t)} style={{cursor:'pointer', color:tipoMsg===t?'#1d8fe8':''}}>
                       {t === 'conexao' ? '🔗 Conexão' : t === 'conexao_com_comum' ? '👥 c/ Comum' : t === 'primeiro_contato' ? '💬 1º Contato' : t === 'follow_up' ? '🔄 Follow-up' : '📱 WhatsApp'}
                     </span>
                   ))}
                </div>

                <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                   <button style={S.btnRow('#ff9f0a')} onClick={() => gerarAbordagem(tipoMsg)}>✦ Gerar</button>
                   <button style={S.btnRow('#fff')} onClick={() => navigator.clipboard.writeText(msgGerada)}>📋 Copiar</button>
                   <button style={S.btnRow('#1d8fe8')} onClick={() => gerarAbordagem(tipoMsg)}>🔄 Regenerar</button>
                   <button style={{...S.btnRow('#1d8fe8'), border:'1px solid #1d8fe840', padding:'5px 12px', borderRadius:'4px'}} onClick={() => {
                        const target = form.linkedin_id || form.linkedin_url.split('/in/')[1]?.split('/')[0]
                        const url = form.connection_degree === '1' 
                          ? `https://www.linkedin.com/messaging/compose/?recipient=${target}&lp_action=send_message&lp_msg=${encodeURIComponent(msgGerada)}`
                          : `${form.linkedin_url}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada)}`
                        window.open(url, '_blank')
                   }}>🚀 ENVIAR AUTOMATIZADO</button>
                </div>

                <div style={{padding:'20px', border:'1px solid #1d8fe8', borderRadius:'4px', background:'#0b1118', minHeight:'100px', lineHeight:'1.6', fontSize:'14px'}}>{msgGerada || 'Pronto para gerar a prospecção perfeita...'}</div>

                {/* WHATSAPP (LARANJA NÉON - IGUAL FOTO NELSON) */}
                <div style={{marginTop:'30px', padding:'15px', border:'1px solid #ff9f0a40', borderRadius:'4px', display:'flex', alignItems:'center', gap:'15px'}}>
                   <span style={{color:'#ff9f0a', fontWeight:'bold', fontSize:'12px'}}>📱 Telefone:</span>
                   <input style={{...S.input, width:'180px', marginBottom:0}} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="5541..." />
                   <button style={{...S.headerBtn('#ff9f0a', 'rgba(255,159,10,0.1)'), marginLeft:'auto'}} onClick={() => window.open(`https://wa.me/${form.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(msgGerada)}`)}>Enviar WhatsApp</button>
                </div>
             </div>
          </div>
        </div>
      )}
      {toast && <div style={{position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)', background:'#00c896', color:'#fff', padding:'10px 30px', borderRadius:'4px', zIndex:10000, fontWeight:'bold'}}>{toast}</div>}
    </div>
  )
}
