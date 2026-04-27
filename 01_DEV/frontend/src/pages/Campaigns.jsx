import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', search_url: '', message_template: '' })

  useEffect(() => { carregarCampanhas() }, [])

  const carregarCampanhas = async () => {
    try {
      const res = await api.get('/api/campaigns')
      setCampaigns(res.data)
    } finally { setLoading(false) }
  }

  const abrirEdicao = (c) => {
    setEditingId(c.id)
    setForm({ name: c.name, description: c.description || '', search_url: c.search_url || '', message_template: c.message_template || '' })
    setModal(true)
  }

  const fecharModal = () => {
    setModal(false)
    setEditingId(null)
    setForm({ name: '', description: '', search_url: '', message_template: '' })
  }

  const excluirCampanha = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha? Os leads vinculados NÃO serão apagados.')) return
    try {
      await api.delete(`/api/campaigns/${id}`)
      carregarCampanhas()
    } catch (err) { alert('Erro ao excluir campanha') }
  }

  const salvarCampanha = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/api/campaigns/${editingId}`, form)
      } else {
        await api.post('/api/campaigns', form)
      }
      fecharModal()
      carregarCampanhas()
    } catch (err) { 
      const msg = err.response?.data?.error || err.message
      alert('Erro ao salvar campanha: ' + msg) 
    }
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main: { flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    card: { background: 'var(--bg2)', border: '1px solid var(--border)', padding: '20px', borderRadius: '4px', position: 'relative', transition: '0.2s' },
    badge: (status) => ({ fontSize: '10px', padding: '2px 8px', background: status === 'ativa' ? '#00c89615' : '#8899aa15', color: status === 'ativa' ? '#00c896' : '#8899aa', borderRadius: '2px', border: `1px solid ${status === 'ativa' ? '#00c89630' : '#8899aa30'}` }),
    btn: { padding: '10px 20px', background: 'var(--blue)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' },
    btnIcon: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.6, transition: '0.2s' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalBox: { background: 'var(--bg2)', padding: '30px', width: '450px', border: '1px solid var(--border)', borderRadius: '4px' },
    input: { width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', color: '#fff', marginBottom: '15px', borderRadius: '4px' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '30px' }}>📁</span>
            <h1>Campanhas</h1>
          </div>
          <button style={S.btn} onClick={() => setModal(true)}>＋ Nova Campanha</button>
        </div>

        {loading ? <p>Carregando...</p> : (
          <div style={S.grid}>
            {campaigns.map(c => (
              <div key={c.id} style={S.card} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                  <button style={S.btnIcon} onClick={() => abrirEdicao(c)} title="Editar Campanha">✏️</button>
                  <button style={{ ...S.btnIcon, color: '#ff3b5c' }} onClick={() => excluirCampanha(c.id)} title="Excluir Campanha">🗑️</button>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <span style={S.badge(c.status || 'ativa')}>{(c.status || 'ativa').toUpperCase()}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                
                <h3 style={{ marginBottom: '8px', paddingRight: '60px' }}>{c.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.4', marginBottom: '15px' }}>{c.description || 'Sem descrição'}</p>

                {c.message_template && (
                  <div style={{ background: 'rgba(29,143,232,0.05)', padding: '12px', borderLeft: '3px solid var(--blue)', marginBottom: '15px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '5px' }}>Template de Mensagem:</div>
                    <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text2)' }}>"{c.message_template.substring(0, 100)}..."</div>
                  </div>
                )}
                
                {c.search_url && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); window.open(c.search_url, '_blank') }}
                    style={{ ...S.btn, background: '#00c896', fontSize: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    🔗 Abrir Pesquisa no LinkedIn
                  </button>
                )}
              </div>
            ))}
            {campaigns.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', background: 'rgba(29,143,232,0.02)', border: '1px dashed var(--border)' }}>
                 <p style={{ color: 'var(--text3)' }}>Nenhuma campanha ativa. Crie uma para começar a organizar seus leads!</p>
              </div>
            )}
          </div>
        )}

        {modal && (
          <div style={S.modal}>
            <div style={S.modalBox}>
              <h2 style={{ marginBottom: '20px' }}>{editingId ? '✏️ Editar Campanha' : '🚀 Nova Campanha'}</h2>
              <form onSubmit={salvarCampanha}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text3)', display: 'block', marginBottom: '5px' }}>NOME DA CAMPANHA</label>
                <input style={S.input} placeholder="Ex: Diretores RH - SP" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text3)', display: 'block', marginBottom: '5px' }}>OBJETIVO</label>
                <input style={S.input} placeholder="O que você busca aqui?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text3)', display: 'block', marginBottom: '5px' }}>LINK DA PESQUISA NO LINKEDIN</label>
                <input style={S.input} placeholder="https://www.linkedin.com/search/results/people/..." value={form.search_url} onChange={e => setForm({...form, search_url: e.target.value})} />

                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text3)', display: 'block', marginBottom: '5px' }}>TEMPLATE DE MENSAGEM (BOAS-VINDAS)</label>
                <textarea 
                  style={{ ...S.input, height: '100px', resize: 'none' }} 
                  placeholder="Olá [NOME], vi seu perfil e gostei muito da sua atuação em [EMPRESA]..." 
                  value={form.message_template} 
                  onChange={e => setForm({...form, message_template: e.target.value})} 
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" style={{ ...S.btn, flex: 1 }}>{editingId ? 'Salvar Alterações' : 'Criar Campanha'}</button>
                  <button type="button" style={{ ...S.btn, background: 'transparent', border: '1px solid var(--border)' }} onClick={fecharModal}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
