import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import CadastroLeads from './pages/CadastroLeads'
import Relatorios from './pages/Relatorios'
import AuthCallback from './pages/AuthCallback'

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c10; --bg2: #0d1219; --bg3: #131b24;
    --border: #1e2d3d; --border2: #243547;
    --blue: #2563eb; --blue-bright: #3b82f6; --blue-glow: rgba(37,99,235,0.1);
    --green: #22c55e; --orange: #f97316; --red: #ef4444; --yellow: #facc15;
    --text: #e8edf2; --text2: #8899aa; --text3: #4a5e70;
    --font: 'Inter', sans-serif; --mono: 'JetBrains Mono', monospace;
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg2); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  button { cursor: pointer; font-family: var(--font); }
  input, select, textarea { font-family: var(--font); }
  a { text-decoration: none; color: inherit; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
`

const RotaProtegida = ({ children }) => {
  const isLocal = window.location.hostname === 'localhost';
  const token = localStorage.getItem('token');
  // Libera geral para o notebook do Samuel (Localhost)
  if (isLocal) return children;
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  if (!document.getElementById('global-styles')) {
    const style = document.createElement('style')
    style.id = 'global-styles'
    style.textContent = globalStyles
    document.head.appendChild(style)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/auth/sucesso" element={<AuthCallback />} />
        <Route path="/dashboard" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
        <Route path="/leads" element={<RotaProtegida><Leads /></RotaProtegida>} />
        <Route path="/cadastro-leads" element={<RotaProtegida><CadastroLeads /></RotaProtegida>} />
        <Route path="/relatorios" element={<RotaProtegida><Relatorios /></RotaProtegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
