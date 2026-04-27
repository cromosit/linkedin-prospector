import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', role: '', lgpdConsent: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.lgpdConsent) return setError('Você deve aceitar os termos de privacidade (LGPD).')
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/register', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  const S = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' },
    grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 },
    card: { position: 'relative', zIndex: 1, width: '480px', background: 'var(--bg2)', border: '1px solid var(--border)', padding: '40px', animation: 'fadeIn 0.5s ease' },
    title: { fontSize: '24px', fontWeight: '700', marginBottom: '8px' },
    subtitle: { color: 'var(--text2)', fontSize: '13px', marginBottom: '24px' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    label: { fontSize: '12px', color: 'var(--text3)', fontWeight: '600', marginBottom: '4px', display: 'block' },
    input: { width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '14px', borderRadius: '4px' },
    lgpd: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)' },
    btn: { width: '100%', padding: '14px', background: 'var(--blue)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '4px', marginTop: '10px' },
    err: { padding: '10px', background: 'rgba(255,59,92,0.1)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '12px', marginBottom: '20px' }
  }

  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.card}>
        <h1 style={S.title}>Criar sua conta</h1>
        <p style={S.subtitle}>Cadastre-se para começar a prospectar com inteligência.</p>

        {error && <div style={S.err}>{error}</div>}

        <form onSubmit={handleRegister} style={S.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 10fr', gap: '16px' }}>
            <div>
              <label style={S.label}>Nome</label>
              <input style={S.input} type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label style={S.label}>E-mail Corporativo</label>
              <input style={S.input} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={S.label}>Empresa</label>
              <input style={S.input} type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
            </div>
            <div>
              <label style={S.label}>Seu Cargo</label>
              <input style={S.input} type="text" value={form.role} onChange={e => setForm({...form, role: e.target.value})} />
            </div>
          </div>

          <div>
            <label style={S.label}>Senha de Acesso</label>
            <input style={S.input} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>

          <div style={S.lgpd}>
            <input type="checkbox" checked={form.lgpdConsent} onChange={e => setForm({...form, lgpdConsent: e.target.checked})} style={{ marginTop: '3px' }} />
            <span style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>
              Eu aceito os <b>Termos de Uso</b> e a <b>Política de Privacidade</b> da Cromosit IT, em conformidade com a <b>LGPD (Lei Geral de Proteção de Dados)</b>. 🇧🇷
            </span>
          </div>

          <button type="submit" style={S.btn} disabled={loading}>
            {loading ? 'Criando conta...' : 'Registrar e Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text2)' }}>
          Já tem uma conta? <Link to="/" style={{ color: 'var(--blue-bright)', fontWeight: '600' }}>Fazer Login</Link>
        </div>
      </div>
    </div>
  )
}
