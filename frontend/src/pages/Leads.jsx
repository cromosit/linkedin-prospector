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
const GRAU = {
  '1': { label: '1º Amigo', color: '#00c896' },
  '2': { label: '2º Amigo de amigo', color: '#1d8fe8' },
  '3': { label: '3º Fora da rede', color: '#8899aa' }
}

const FORM_EMPTY = {
  name: '', headline: '', company: '', location: '',
  linkedin_url: '', email: '', phone: '', website: '',
  birthday: '', connected_since: '', mutual_connections: '',
  about: '', service_interest: '', temperature: 'frio',
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

  const gerarMensagem = async (lead, tipo) => {
    setGerandoMsg(true); setTipoMsg(tipo || 'conexao')
    try {
      const res = await api.post(`/api/leads/${lead.id || form.id}/gerar-mensagem`, { tipo: tipo || 'conexao' })
      setMsgGerada(res.data.mensagem)
    } catch (err) { setMsgGerada('Erro ao gerar abordagem.') }
    finally { setGerandoMsg(false) }
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
    badge: (color) => ({ padding: '3px 7px', background: color + '20', border: `1px solid ${color}40`, color, fontSize: '10px', borderRadius: '3px' }),
    btnRow: (color) => ({ background: 'transparent', border: 'none', color, cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox: { background: '#0d131b', width: '850px', maxWidth: '96%', maxHeight: '94vh', overflow: 'auto', borderRadius: '4px', border: '1px solid #233142' },
    modalHeader: { padding: '12px 20px', borderBottom: '1px solid #1d8fe8', display: 'flex', alignItems: 'center', background: '#121922' },
    sectionTitle: { color: '#1d8fe8', fontSize: '11px', fontWeight: '800', marginBottom: '15px', marginTop: '10px', textTransform: 'uppercase' },
    label: { color: '#8899aa', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', display: 'block', textTransform: 'uppercase' },
    input: { width: '100%', background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '8px 12px', borderRadius: '2px', fontSize: '13px', outline: 'none' },
    aiLabel: { color: '#ff9f0a', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' },
    aiBox: { width: '100%', background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '10px', borderRadius: '2px', fontSize: '13px', marginBottom: '15px' },
    waBox: { border: '1px solid #ff9f0a', padding: '15px', borderRadius: '4px', marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.toolbar}>
           <h3 style={{ margin: 0 }}>Leads</h3>
           <button style={S.btnRow('#1d8fe8')} onClick={() => { setLeadSel(null); setForm(FORM_EMPTY); setModal(true) }}>＋ Novo Lead</button>
           <input style={{...S.input, width:'250px', marginBottom:0}} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
           <span style={{marginLeft:'auto', fontSize:'11px', color:'#8899aa'}}>{totalLeads} leads</span>
        </div>

        <div style={S.content}>
          <table style={S.table}>
             <thead>
                <tr>
                   <th style={S.th}>LEAD</th>
                   <th style={S.th}>EMPRESA</th>
                   <th style={S.th}>GRAU</th>
                   <th style={S.th}>STATUS</th>
                   <th style={S.th}>AÇÕES</th>
                </tr>
             </thead>
             <tbody>
                {leads.map(l => (
                  <tr key={l.id}>
                    <td style={S.td}><b>{l.name}</b><br/><span style={{fontSize:'10px', color:'#8899aa'}}>{l.headline}</span></td>
                    <td style={S.td}>{l.company}</td>
                    <td style={S.td}><span style={S.badge(GRAU[l.connection_degree]?.color)}>{GRAU[l.connection_degree]?.label}</span></td>
                    <td style={S.td}><select style={{...S.input, width:'90px', padding:'2px'}} value={l.status} onChange={() => {}}>{Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></td>
                    <td style={S.td}><button style={S.btnRow('#1d8fe8')} onClick={() => abrirEditar(l)}>✏ Editar / IA</button></td>
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
                <span style={{fontWeight:'bold'}}>✏ {form.name || 'Novo Lead'}</span>
                <div style={{marginLeft:'auto', display:'flex', gap:'15px'}}>
                   <button style={S.btnRow('#00c896')} onClick={salvarLead}>✓ Salvar</button>
                   <button style={S.btnRow('#8899aa')} onClick={() => setModal(false)}>✕</button>
                </div>
             </div>

             <div style={{padding:'20px'}}>
                <div style={S.aiLabel}>🎯 O QUE ESTE LEAD PRECISA? — PREENCHIDO PELA IA</div>
                <textarea style={{...S.aiBox, border:'1px solid #1d8fe8', height:'50px'}} value={form.service_interest} onChange={e => setForm({...form, service_interest:e.target.value})} />

                <div style={S.aiLabel}>📝 NOTAS INTERNAS — DICAS DA IA</div>
                <textarea style={{...S.aiBox, border:'1px solid #233142', height:'90px', color:'#fff'}} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} />

                <div style={S.sectionTitle}>✦ MENSAGEM COM IA</div>
                <div style={{display:'flex', gap:'15px', color:'#8899aa', fontSize:'11px', marginBottom:'15px'}}>
                   {['conexao', 'conexao_com_comum', 'primeiro_contato', 'follow_up', 'whatsapp'].map(t => (
                     <span key={t} onClick={() => setTipoMsg(t)} style={{cursor:'pointer', color:tipoMsg===t?'#1d8fe8':''}}>
                       {t === 'conexao' ? '🔗 Conexão' : t === 'conexao_com_comum' ? '👥 c/ Comum' : t === 'primeiro_contato' ? '💬 1º Contato' : t === 'follow_up' ? '🔄 Follow-up' : '📱 WhatsApp'}
                     </span>
                   ))}
                </div>

                <div style={{display:'flex', gap:'15px', marginBottom:'10px'}}>
                   <button style={S.btnRow('#ff9f0a')} onClick={() => gerarMensagem(leadSel || form, tipoMsg)} disabled={gerandoMsg}>✦ Gerar</button>
                   <button style={S.btnRow('#fff')} onClick={() => { navigator.clipboard.writeText(msgGerada); showToast('Copiado!') }}>📋 Copiar</button>
                   <button style={S.btnRow('#1d8fe8')} onClick={() => gerarMensagem(leadSel || form, tipoMsg)}>🔄 Regenerar</button>
                   
                   { (leadSel?.linkedin_url || form.linkedin_url) && (
                     <button style={{...S.btnRow('#0a66c2'), background:'rgba(10,102,194,0.1)', padding:'4px 12px', border:'1px solid #0a66c2', borderRadius:'4px'}} onClick={() => {
                        const urlF = leadSel?.linkedin_url || form.linkedin_url;
                        const target = leadSel?.linkedin_id || urlF.split('/in/')[1]?.replace(/\/$/, '')
                        const deg = leadSel?.connection_degree || form.connection_degree
                        const url = deg === '1'
                          ? `https://www.linkedin.com/messaging/compose/?recipient=${target}&lp_action=send_message&lp_msg=${encodeURIComponent(msgGerada)}`
                          : `${urlF}?lp_action=connect&lp_msg=${encodeURIComponent(msgGerada)}`
                        window.open(url, '_blank')
                     }}>🚀 ENVIAR AUTOMATIZADO</button>
                   )}
                </div>

                <div style={{border:'1px solid #1d8fe8', padding:'15px', borderRadius:'4px', fontSize:'14px', lineHeight:'1.5'}}>{msgGerada || 'Gere uma abordagem acima...'}</div>

                {/* WHATSAPP RE-INSTANTANEADO (FOTO DO PRINT ANTERIOR) */}
                <div style={S.waBox}>
                   <span style={{color:'#ff9f0a', fontWeight:'bold', fontSize:'12px'}}>📱 Telefone:</span>
                   <input style={{...S.input, width:'180px', marginBottom:0, border:'1px solid #233142'}} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="Ex: 5541..." />
                   <button style={{...S.btnRow('#ff9f0a'), marginLeft:'auto', background:'rgba(255,159,10,0.1)', padding:'6px 20px', borderRadius:'4px'}} onClick={() => {
                      const num = form.phone?.replace(/\D/g, '');
                      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msgGerada)}`, '_blank');
                   }}>Enviar</button>
                </div>
             </div>
          </div>
        </div>
      )}
      {toast && <div style={{position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)', background:'#00c896', padding:'10px 25px', borderRadius:'4px', zIndex:9999, fontWeight:'bold'}}>{toast}</div>}
    </div>
  )
}
