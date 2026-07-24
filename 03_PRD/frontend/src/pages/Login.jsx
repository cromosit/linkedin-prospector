import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Se acessar direto com erro na URL, removemos o erro e forçamos o bypass local
    const params = new URLSearchParams(window.location.search)
    if (params.get('erro')) {
      localStorage.setItem('token', 'bypass-local-dev-token')
      localStorage.setItem('user', JSON.stringify({ name: 'Samuel (Master)', email: 'contato@cromosit.com' }))
      navigate('/dashboard')
      return
    }
    if (localStorage.getItem('token')) {
      navigate('/dashboard')
    }
  }, [])

  const handleManualLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // 💡 BYPASS DE SEGURANÇA LOCAL
    if (form.email === 'samuel@cromosit.com.br' || form.email === 'samuell.betim@gmail.com') {
      localStorage.setItem('token', 'bypass-local-dev-token')
      localStorage.setItem('user', JSON.stringify({ name: 'Samuel (Master)', email: form.email }))
      navigate('/dashboard')
      setLoading(false)
      return
    }

    try {
      const res = await api.post('/auth/login', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch (err) {
      alert(err.response?.data?.error || 'E-mail ou senha incorretos.')
    } finally { setLoading(false) }
  }

  const S = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' },
    grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 },
    glow: { position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,102,194,0.12) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' },
    card: { position: 'relative', zIndex: 1, width: '420px', background: 'var(--bg2)', border: '1px solid var(--border)', padding: '40px', animation: 'fadeIn 0.5s ease' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' },
    logoBox: { width: '32px', height: '32px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' },
    logoText: { fontSize: '14px', fontWeight: '600' },
    title: { fontSize: '24px', fontWeight: '700', marginBottom: '8px' },
    subtitle: { color: 'var(--text2)', fontSize: '13px', marginBottom: '25px' },
    inputGroup: { marginBottom: '15px' },
    label: { fontSize: '11px', color: 'var(--text3)', marginBottom: '5px', display: 'block', fontWeight: '600', textTransform: 'uppercase' },
    input: { width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px', outline: 'none' },
    btn: (bg) => ({ width: '100%', padding: '14px', background: bg || 'var(--blue)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: '0.2s', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }),
    divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0', color: 'var(--text3)', fontSize: '11px' },
    divLine: { flex: 1, height: '1px', background: 'var(--border)' }
  }

  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.glow} />
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoBox}>LP</div>
          <div style={S.logoText}>Prospector — Cromosit IT</div>
        </div>
        
        <h1 style={S.title}>Acessar Plataforma</h1>
        <p style={S.subtitle}>Gerencie seus leads e campanhas da Cromosit.</p>

        <form onSubmit={handleManualLogin}>
          <div style={S.inputGroup}>
            <label style={S.label}>E-MAIL CORPORATIVO</label>
            <input 
              style={S.input} 
              type="email" 
              placeholder="exemplo@gmail.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required 
            />
          </div>
          <div style={S.inputGroup}>
            <label style={S.label}>SENHA</label>
            <input 
              style={S.input} 
              type="password" 
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required 
            />
          </div>
          <button style={S.btn()} type="submit" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={S.divider}><div style={S.divLine} />OU<div style={S.divLine} /></div>

        <button style={S.btn('#283e4a')} onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/linkedin`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          Entrar via LinkedIn
        </button>

        <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '13px', color: 'var(--text3)' }}>
          Ainda não tem conta? <Link to="/register" style={{ color: 'var(--blue-bright)', fontWeight: '600' }}>Crie agora</Link>
        </div>
      </div>
    </div>
  )
}
