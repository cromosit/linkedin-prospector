import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Pipeline from './pages/Pipeline'
import Campaigns from './pages/Campaigns'
import Tasks from './pages/Tasks'
import Integrations from './pages/Integrations'
import Settings from './pages/Settings'
import Relatorios from './pages/Relatorios'
import AuthCallback from './pages/AuthCallback'

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root, .theme-dark {
    --bg: #080c10; --bg2: #0d1219; --bg3: #131b24;
    --border: #1e2d3d; --border2: #243547;
    --blue: #0a66c2; --blue-bright: #1d8fe8; --blue-glow: rgba(29,143,232,0.15);
    --green: #00c896; --orange: #ff6b35; --red: #ff3b5c; --yellow: #ffd60a;
    --text: #e8edf2; --text2: #8899aa; --text3: #4a5e70;
    --font: 'Sora', sans-serif; --mono: 'JetBrains Mono', monospace;
  }
  .theme-light {
    --bg: #f8fafc; --bg2: #ffffff; --bg3: #f1f5f9;
    --border: #cbd5e1; --border2: #94a3b8;
    --blue: #0a66c2; --blue-bright: #2563eb; --blue-glow: rgba(37,99,235,0.1);
    --green: #059669; --orange: #ea580c; --red: #dc2626; --yellow: #ca8a04;
    --text: #0f172a; --text2: #475569; --text3: #64748b;
    --font: 'Sora', sans-serif; --mono: 'JetBrains Mono', monospace;
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; transition: background-color 0.2s, color 0.2s; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg2); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
  button { cursor: pointer; font-family: var(--font); }
  input, select, textarea { font-family: var(--font); }
  a { text-decoration: none; color: inherit; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
`

const RotaProtegida = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/" replace />
}

export default function App() {
  if (!document.getElementById('global-styles')) {
    const style = document.createElement('style')
    style.id = 'global-styles'
    style.textContent = globalStyles
    document.head.appendChild(style)
  }

  // Inicializa o tema salvo no localStorage
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'dark';
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/sucesso" element={<AuthCallback />} />
        <Route path="/dashboard" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
        <Route path="/leads" element={<RotaProtegida><Leads /></RotaProtegida>} />
        <Route path="/pipeline" element={<RotaProtegida><Pipeline /></RotaProtegida>} />
        <Route path="/campaigns" element={<RotaProtegida><Campaigns /></RotaProtegida>} />
        <Route path="/tasks" element={<RotaProtegida><Tasks /></RotaProtegida>} />
        <Route path="/integrations" element={<RotaProtegida><Integrations /></RotaProtegida>} />
        <Route path="/settings" element={<RotaProtegida><Settings /></RotaProtegida>} />
        <Route path="/relatorios" element={<RotaProtegida><Relatorios /></RotaProtegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
