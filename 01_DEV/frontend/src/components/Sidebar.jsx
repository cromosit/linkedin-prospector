import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  // Mantém o estado sincronizado se o tema mudar de outra forma
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
  }, [location])

  const toggleTheme = () => {
    const novoTema = theme === 'light' ? 'dark' : 'light'
    setTheme(novoTema)
    localStorage.setItem('theme', novoTema)
    document.body.className = novoTema === 'light' ? 'theme-light' : 'theme-dark'
  }

  const S = {
    sidebar: { width: '220px', flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 },
    logo: { padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logoBox: { width: '28px', height: '28px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' },
    logoText: { fontSize: '13px', fontWeight: '600' },
    status: { display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 12px', padding: '7px 10px', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', fontSize: '11px', color: 'var(--green)' },
    statusDot: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' },
    nav: { flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '3px' },
    sectionLabel: { fontSize: '10px', color: 'var(--text3)', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 10px 5px' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', background: active ? 'var(--blue-glow)' : 'transparent', border: active ? '1px solid rgba(29,143,232,0.2)' : '1px solid transparent', color: active ? 'var(--blue-bright)' : 'var(--text2)', fontSize: '13px', fontWeight: active ? '600' : '400', cursor: 'pointer', transition: 'all 0.15s' }),
    footer: { padding: '12px', borderTop: '1px solid var(--border)' },
    user: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '6px' },
    avatar: { width: '26px', height: '26px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 },
    userName: { fontSize: '12px', fontWeight: '500' },
    userEmail: { fontSize: '10px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    logoutBtn: { width: '100%', padding: '7px 10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '⬡' },
    { path: '/leads', label: 'Leads', icon: '◈' },
    { path: '/pipeline', label: 'Pipeline', icon: '📈' },
    { path: '/relatorios', label: 'Relatórios', icon: '📊' },
    { path: '/campaigns', label: 'Campanhas', icon: '📁' },
    { path: '/tasks', label: 'Tarefas', icon: '📅' },
    { path: '/integrations', label: 'Integrações', icon: '🔗' },
    { path: '/settings', label: 'Configurações', icon: '⚙️' },
  ]

  return (
    <div style={S.sidebar}>
      <div style={S.logo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={S.logoBox}>LP</div>
          <div style={S.logoText}>Prospector</div>
        </div>
        <button 
          onClick={toggleTheme} 
          style={{ background: 'transparent', border: 'none', fontSize: '15px', cursor: 'pointer', outline: 'none' }}
          title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
        >
          {theme === 'light' ? '🌑' : '☀️'}
        </button>
      </div>
      <div style={S.status}>
        <div style={S.statusDot} />
        {window.location.hostname === 'localhost' ? 'API Local · DEV' : 'API online · Railway'}
      </div>
      <div style={S.nav}>
        <div style={S.sectionLabel}>Menu</div>
        {navItems.map(item => (
          <button key={item.path} style={S.navItem(location.pathname === item.path)} onClick={() => navigate(item.path)}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>
      <div style={S.footer}>
        <div style={{ ...S.user, cursor: 'pointer' }} onClick={() => navigate('/settings')} title="Ver Configurações/Perfil">
          <div style={S.avatar}>{user.name ? user.name[0].toUpperCase() : 'U'}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={S.userName}>{user.name || 'Usuário'}</div>
            <div style={S.userEmail}>{user.email || ''}</div>
          </div>
        </div>
        <button style={S.logoutBtn} onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/') }}>
          ↩ Sair
        </button>
      </div>
    </div>
  )
}
