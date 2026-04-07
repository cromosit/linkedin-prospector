import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Autenticando...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('token', token)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        localStorage.setItem('user', JSON.stringify({ name: payload.name, email: payload.email }))
      } catch (e) {}
      setStatus('Login realizado! Redirecionando...')
      setTimeout(() => navigate('/dashboard'), 1000)
    } else {
      setStatus('Erro na autenticação.')
      setTimeout(() => navigate('/'), 2000)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text2)', fontSize: '14px' }}>{status}</p>
    </div>
  )
}
