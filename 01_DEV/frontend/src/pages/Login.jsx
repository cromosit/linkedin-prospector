import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/dashboard')
    const params = new URLSearchParams(window.location.search)
    if (params.get('erro')) alert('Erro ao fazer login com LinkedIn. Tente novamente.')
  }, [])

  const S = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' },
    grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 },
    glow: { position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,102,194,0.12) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' },
    card: { position: 'relative', zIndex: 1, width: '420px', background: 'var(--bg2)', border: '1px solid var(--border)', padding: '48px 40px', animation: 'fadeIn 0.5s ease' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' },
    logoBox: { width: '36px', height: '36px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#fff', fontFamily: 'var(--mono)' },
    logoText: { fontSize: '15px', fontWeight: '600', letterSpacing: '-0.02em' },
    logoSub: { fontSize: '11px', color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' },
    title: { fontSize: '26px', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: '1.2', marginBottom: '8px' },
    subtitle: { color: 'var(--text2)', fontSize: '13px', marginBottom: '36px', lineHeight: '1.6' },
    btn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '14px 24px', background: 'var(--blue)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
    divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0', color: 'var(--text3)', fontSize: '12px' },
    divLine: { flex: 1, height: '1px', background: 'var(--border)' },
    features: { display: 'flex', flexDirection: 'column', gap: '10px' },
    feature: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' },
    dot: { width: '6px', height: '6px', background: 'var(--green)', borderRadius: '50%', flexShrink: 0 },
    footer: { marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }
  }

  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.glow} />
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoBox}>LP</div>
          <div><div style={S.logoText}>LinkedIn Prospector</div><div style={S.logoSub}>Cromosit IT</div></div>
        </div>
        <h1 style={S.title}>Prospecção<br />inteligente.</h1>
        <p style={S.subtitle}>Capture, organize e converta leads do LinkedIn com IA.</p>
        <button style={S.btn}
          onClick={() => {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            window.location.href = `${apiBase}/auth/linkedin`;
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-bright)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--blue)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          Entrar com LinkedIn
        </button>
        <div style={S.divider}><div style={S.divLine} />O que você vai ter acesso<div style={S.divLine} /></div>
        <div style={S.features}>
          {['Captura em massa de leads do LinkedIn','Pipeline por grau de conexão (1º, 2º, 3º)','Mensagens personalizadas com IA','Notificação automática via WhatsApp'].map((f, i) => (
            <div key={i} style={S.feature}><div style={S.dot} />{f}</div>
          ))}
        </div>
        <div style={S.footer}>Cromosit IT © {new Date().getFullYear()} — Curitiba/PR</div>
      </div>
    </div>
  )
}
