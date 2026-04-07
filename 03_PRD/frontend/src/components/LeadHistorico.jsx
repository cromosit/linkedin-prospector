import { useState, useEffect } from 'react'
import api from '../api'

const ICONES = {
  mensagem_gerada: '✦',
  whatsapp_enviado: '📱',
  linkedin_msg_preparada: '💬',
  mensagem_enviada: '📤',
  ligacao: '📞',
  reuniao: '🤝',
  nota: '📝',
  default: '●'
}

const CORES = {
  mensagem_gerada: 'var(--blue-bright)',
  whatsapp_enviado: 'var(--green)',
  linkedin_msg_preparada: '#0a66c2',
  mensagem_enviada: 'var(--green)',
  ligacao: 'var(--orange)',
  reuniao: 'var(--yellow)',
  nota: 'var(--text2)',
  default: 'var(--text3)'
}

export default function LeadHistorico({ leadId, onClose }) {
  const [atividades, setAtividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [novaAtividade, setNovaAtividade] = useState('')
  const [tipoAtividade, setTipoAtividade] = useState('nota')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { if (leadId) carregarHistorico() }, [leadId])

  const carregarHistorico = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/leads/${leadId}`)
      setAtividades(res.data.lead.lead_activities?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const registrarAtividade = async () => {
    if (!novaAtividade.trim()) return
    setSalvando(true)
    try {
      await api.post(`/api/leads/${leadId}/atividades`, { type: tipoAtividade, description: novaAtividade })
      setNovaAtividade('')
      carregarHistorico()
    } catch (err) { alert('Erro ao registrar atividade') }
    finally { setSalvando(false) }
  }

  const formatarData = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const S = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' },
    modal: { background: 'var(--bg2)', border: '1px solid var(--border)', width: '500px', maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' },
    header: { padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '15px', fontWeight: '700' },
    body: { flex: 1, overflow: 'auto', padding: '16px 22px' },
    addSection: { padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg3)' },
    addRow: { display: 'flex', gap: '8px', marginTop: '8px' },
    input: { flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none' },
    select: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontSize: '12px', outline: 'none', cursor: 'pointer' },
    addBtn: { padding: '7px 16px', background: 'var(--blue)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    timeline: { position: 'relative', paddingLeft: '24px' },
    timelineLine: { position: 'absolute', left: '8px', top: 0, bottom: 0, width: '2px', background: 'var(--border)' },
    item: { position: 'relative', marginBottom: '20px' },
    dot: (color) => ({ position: 'absolute', left: '-20px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: color, border: '2px solid var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px' }),
    itemCard: { background: 'var(--bg3)', border: '1px solid var(--border)', padding: '10px 12px' },
    itemType: (color) => ({ fontSize: '10px', fontWeight: '600', color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }),
    itemDesc: { fontSize: '12px', color: 'var(--text)', lineHeight: '1.5' },
    itemData: { fontSize: '10px', color: 'var(--text3)', marginTop: '6px' },
    empty: { textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: '13px' }
  }

  const tipoLabel = { mensagem_gerada: 'IA — Mensagem gerada', whatsapp_enviado: 'WhatsApp enviado', linkedin_msg_preparada: 'LinkedIn — Mensagem preparada', mensagem_enviada: 'Mensagem enviada', ligacao: 'Ligação', reuniao: 'Reunião', nota: 'Nota' }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <div style={S.title}>📋 Histórico de Atividades</div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '18px', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>

        <div style={S.body}>
          {loading ? (
            <div style={S.empty}>Carregando histórico...</div>
          ) : atividades.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
              Nenhuma atividade registrada ainda.
            </div>
          ) : (
            <div style={S.timeline}>
              <div style={S.timelineLine} />
              {atividades.map((a, i) => {
                const cor = CORES[a.type] || CORES.default
                const icone = ICONES[a.type] || ICONES.default
                return (
                  <div key={a.id || i} style={S.item}>
                    <div style={S.dot(cor)}>{icone}</div>
                    <div style={S.itemCard}>
                      <div style={S.itemType(cor)}>{tipoLabel[a.type] || a.type}</div>
                      <div style={S.itemDesc}>{a.description}</div>
                      <div style={S.itemData}>{formatarData(a.created_at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={S.addSection}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Registrar atividade manual</div>
          <div style={S.addRow}>
            <select style={S.select} value={tipoAtividade} onChange={e => setTipoAtividade(e.target.value)}>
              <option value="nota">📝 Nota</option>
              <option value="ligacao">📞 Ligação</option>
              <option value="reuniao">🤝 Reunião</option>
              <option value="mensagem_enviada">📤 Mensagem enviada</option>
            </select>
            <input style={S.input} value={novaAtividade} onChange={e => setNovaAtividade(e.target.value)} placeholder="Descreva a atividade..." onKeyDown={e => e.key === 'Enter' && registrarAtividade()} />
            <button style={S.addBtn} onClick={registrarAtividade} disabled={salvando}>{salvando ? '...' : '+'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
