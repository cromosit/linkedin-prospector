import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  
  // States de Perfil
  const [profile, setProfile] = useState({ name: '', email: '', company: '', role: '' })
  
  // States de Chaves de IA
  const [aiSettings, setAiSettings] = useState({
    openai_key: '',
    gemini_key: '',
    claude_key: '',
    preferred_provider: 'openai'
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      // Carrega Perfil
      const resP = await api.get('/api/profile')
      setProfile({
        name: resP.data.name || '',
        email: resP.data.email || '',
        company: resP.data.company || '',
        role: resP.data.role || ''
      })

      // Carrega Chaves de IA
      const resAI = await api.get('/api/ai-settings')
      setAiSettings(resAI.data)
    } catch (err) {
      console.error('Erro ao carregar dados de configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  const salvarPerfil = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const res = await api.put('/api/profile', profile)
      // Atualiza os dados locais do user logado no localStorage
      const localUser = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...localUser, name: profile.name, email: profile.email }))
      alert('Perfil atualizado com sucesso!')
      window.location.reload() // Recarrega para aplicar as mudanças de nome na Sidebar
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setSalvando(false)
    }
  }

  const salvarIA = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const res = await api.post('/api/ai-settings', aiSettings)
      setAiSettings(res.data)
      alert('Configurações de IA salvas com sucesso!')
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair do sistema?')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
    main: { flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' },
    header: { marginBottom: '10px' },
    card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '30px', maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '20px' },
    tabs: { display: 'flex', gap: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '10px', maxWidth: '650px' },
    tabBtn: (active) => ({
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid var(--blue-bright)' : '2px solid transparent',
      color: active ? 'var(--blue-bright)' : 'var(--text2)',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.15s'
    }),
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' },
    label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--text3)', textTransform: 'uppercase' },
    input: { padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', outline: 'none', fontSize: '13px' },
    select: { padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', outline: 'none', fontSize: '13px', cursor: 'pointer' },
    btnSubmit: { padding: '12px 24px', background: 'var(--blue-bright)', border: 'none', color: '#fff', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '10px' },
    btnLogout: { padding: '12px 24px', background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '15px' },
    themeOption: (active) => ({
      flex: 1,
      padding: '20px',
      background: 'var(--bg)',
      border: active ? '2px solid var(--blue-bright)' : '1px solid var(--border)',
      borderRadius: '6px',
      cursor: 'pointer',
      textAlign: 'center',
      fontWeight: 'bold',
      color: active ? 'var(--blue-bright)' : 'var(--text2)',
      transition: 'all 0.15s'
    })
  }

  if (loading) {
    return (
      <div style={S.layout}>
        <Sidebar />
        <div style={S.main}>
          <div style={{ color: 'var(--text)', padding: '20px' }}>Carregando configurações...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.header}>
          <h1>⚙️ Central do Usuário</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '5px' }}>Gerencie seu perfil e suas chaves de inteligência artificial.</p>
        </div>

        {/* Abas */}
        <div style={S.tabs}>
          <button style={S.tabBtn(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>Meu Perfil</button>
          <button style={S.tabBtn(activeTab === 'ai')} onClick={() => setActiveTab('ai')}>Configurações de IA</button>
        </div>

        {/* Aba 1: Perfil */}
        {activeTab === 'profile' && (
          <div style={S.card} className="fade-in">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', color: 'var(--blue-bright)' }}>Informações de Perfil</h3>
            <form onSubmit={salvarPerfil} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={S.formGroup}>
                <label style={S.label}>Nome Completo</label>
                <input style={S.input} type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>E-mail Corporativo</label>
                <input style={S.input} type="email" value={profile.email} disabled style={{ ...S.input, opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Empresa</label>
                <input style={S.input} type="text" placeholder="Cromosit IT" value={profile.company} onChange={e => setProfile({...profile, company: e.target.value})} />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Cargo / Função</label>
                <input style={S.input} type="text" placeholder="Diretor Comercial" value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} />
              </div>

              <button style={S.btnSubmit} type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold', textTransform: 'uppercase' }}>Encerrar Sessão</span>
              <button style={S.btnLogout} onClick={handleLogout}>Desconectar da Plataforma</button>
            </div>
          </div>
        )}

        {/* Aba 2: Chaves de IA */}
        {activeTab === 'ai' && (
          <div style={S.card} className="fade-in">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', color: '#10b981' }}>Chaves de API de Inteligência Artificial</h3>
            <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>Configure suas próprias chaves de API. Ao utilizar chaves personalizadas, o sistema dará preferência a elas sobre a chave global do servidor. Suas chaves são salvas criptografadas e com segurança.</p>
            
            <form onSubmit={salvarIA} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={S.formGroup}>
                <label style={S.label}>Provedor Preferido para Enriquecimento</label>
                <select style={S.select} value={aiSettings.preferred_provider} onChange={e => setAiSettings({...aiSettings, preferred_provider: e.target.value})}>
                  <option value="openai">OpenAI (ChatGPT - gpt-4o-mini)</option>
                  <option value="gemini">Google Gemini (gemini-2.5-flash)</option>
                  <option value="claude">Anthropic Claude (claude-3.5-sonnet)</option>
                </select>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>OpenAI API Key (ChatGPT)</label>
                <input style={S.input} type="password" placeholder="sk-..." value={aiSettings.openai_key} onChange={e => setAiSettings({...aiSettings, openai_key: e.target.value})} />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Google Gemini API Key</label>
                <input style={S.input} type="password" placeholder="AIzaSy..." value={aiSettings.gemini_key} onChange={e => setAiSettings({...aiSettings, gemini_key: e.target.value})} />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Anthropic Claude API Key</label>
                <input style={S.input} type="password" placeholder="sk-ant-..." value={aiSettings.claude_key} onChange={e => setAiSettings({...aiSettings, claude_key: e.target.value})} />
              </div>

              <button style={{ ...S.btnSubmit, background: '#10b981' }} type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Chaves de IA'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
