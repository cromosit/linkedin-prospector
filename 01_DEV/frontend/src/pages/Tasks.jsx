import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarTarefas() }, [])

  const carregarTarefas = async () => {
    try {
      const res = await api.get('/api/tasks')
      setTasks(res.data)
    } finally { setLoading(false) }
  }

  const concluirTarefa = async (id) => {
    try {
      await api.patch(`/api/tasks/${id}/complete`)
      carregarTarefas()
    } catch (err) { alert('Erro ao concluir tarefa') }
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main: { flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    list: { display: 'flex', flexDirection: 'column', gap: '12px' },
    item: { background: 'var(--bg2)', border: '1px solid var(--border)', padding: '16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '20px' },
    check: { width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    urgent: { color: 'var(--red)', fontSize: '11px', fontWeight: 'bold' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.header}>
          <h1>📅 Tarefas de Follow-up</h1>
          <span style={{ color: 'var(--text3)' }}>{tasks.length} tarefas pendentes</span>
        </div>

        {loading ? <p>Carregando lista...</p> : (
          <div style={S.list}>
            {tasks.map(t => {
              const info = t.leads || { name: 'Lead não identificado' }
              const isAtrasado = new Date(t.due_date) < new Date()
              return (
                <div key={t.id} style={S.item}>
                  <div style={S.check} onClick={() => concluirTarefa(t.id)} title="Marcar como concluída" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{t.title}</span>
                      {isAtrasado && <span style={S.urgent}>ATRASADO</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                       Lead: <b>{info.name}</b> {info.company ? `pela ${info.company}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: isAtrasado ? 'var(--red)' : 'var(--blue-bright)' }}>
                      🗓️ {new Date(t.due_date).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>Prazo: {new Date(t.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })}
            {tasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '100px', background: 'rgba(29,143,232,0.02)', border: '1px dashed var(--border)' }}>
                <p style={{ color: 'var(--text3)' }}>Nada pendente por aqui! 🎉 Todos os seus follow-ups estão em dia.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
