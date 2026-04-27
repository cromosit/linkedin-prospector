import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Integrations() {
  const [linkedinLoading, setLinkedinLoading] = useState(false)
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [linkedinStatus, setLinkedinStatus] = useState('disconnected')
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected')

  // Verifica se as contas já estão conectadas ao abrir a página
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/api/unipile/accounts')
        // Unipile pode retornar em 'accounts' ou 'items'
        const accounts = res.data.accounts || res.data.items || res.data || []
        
        const li = accounts.find(a => a.type === 'LINKEDIN')
        const wa = accounts.find(a => a.type === 'WHATSAPP')
        
        if (li && li.status === 'RUNNING') setLinkedinStatus('connected')
        if (wa && wa.status === 'RUNNING') setWhatsappStatus('connected')
      } catch (err) {
        console.error('Erro ao buscar status:', err)
      }
    }
    checkStatus()
  }, [])

  const conectarUnipile = async (type) => {
    // 1. Identifica qual botão foi clicado e ativa o loading só dele
    if (type === 'LINKEDIN') setLinkedinLoading(true)
    else setWhatsappLoading(true)

    try {
      console.log(`Solicitando conexão para: ${type}`)
      const res = await api.get(`/api/unipile/connect-link?type=${type}`)
      
      if (res.data.url) {
        window.location.href = res.data.url 
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      alert(`Erro na conexão (${type}): ` + msg)
    } finally { 
      // 2. Desativa os loadings ao terminar
      setLinkedinLoading(false)
      setWhatsappLoading(false) 
    }
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main: { flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px' },
    card: { background: 'linear-gradient(145deg, #161e27, #0d141b)', border: '1px solid var(--border)', padding: '30px', borderRadius: '12px', display: 'flex', gap: '24px' },
    icon: (bg) => ({ width: '60px', height: '60px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }),
    btn: { padding: '12px 24px', background: 'var(--blue)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginTop: '15px' },
    statusBadge: { fontSize: '11px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '5px' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <h1>⚙️ Integrações</h1>
        <p style={{ color: 'var(--text2)', maxWidth: '600px' }}>Conecte suas contas para habilitar o <b>Inbox Unificado</b> e o <b>Follow-up Automático</b> nativo da Cromosit IT.</p>

        <div style={S.grid}>
          {/* LINKEDIN */}
          <div style={S.card}>
            <div style={S.icon('#0077b5')}>L</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '8px' }}>LinkedIn Cloud</h3>
              <p style={{ fontSize: '13px', color: 'var(--text3)', lineHeight: '1.5' }}>Permite que o sistema leia mensagens e envie respostas mesmo com o seu computador desligado.</p>
              <button 
                style={{ ...S.btn, background: linkedinStatus === 'connected' ? '#10b981' : 'var(--blue)' }} 
                onClick={() => conectarUnipile('LINKEDIN')} 
                disabled={linkedinLoading || linkedinStatus === 'connected'}
              >
                {linkedinLoading ? 'Preparando LinkedIn...' : linkedinStatus === 'connected' ? 'LinkedIn Ativo' : 'Conectar LinkedIn'}
              </button>
              <div style={{ ...S.statusBadge, marginTop: '15px' }}>
                {linkedinStatus === 'connected' ? '🟢 Conectado e Operando' : '⚪ Status: Não conectado'}
              </div>
            </div>
          </div>

          {/* WHATSAPP */}
          <div style={S.card}>
            <div style={S.icon('#10b981')}>W</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '8px' }}>WhatsApp Cloud</h3>
              <p style={{ fontSize: '13px', color: 'var(--text3)', lineHeight: '1.5' }}>Sincronize suas conversas do WhatsApp com o CRM para ter o histórico completo do lead.</p>
              <button 
                style={{ ...S.btn, background: whatsappStatus === 'connected' ? '#10b981' : '#25d366' }} 
                onClick={() => conectarUnipile('WHATSAPP')} 
                disabled={whatsappLoading || whatsappStatus === 'connected'}
              >
                {whatsappLoading ? 'Preparando WhatsApp...' : whatsappStatus === 'connected' ? 'WhatsApp Ativo' : 'Conectar WhatsApp'}
              </button>
              <div style={{ ...S.statusBadge, marginTop: '15px' }}>
                {whatsappStatus === 'connected' ? '🟢 Conectado e Operando' : '⚪ Status: Não conectado'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
