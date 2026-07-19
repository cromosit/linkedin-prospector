import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Pipeline() {
  const [pipelines, setPipelines] = useState([])
  const [activePipeline, setActivePipeline] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingStage, setEditingStage] = useState(null)

  useEffect(() => { 
    carregarTudo() 
  }, [])

  const carregarTudo = async () => {
    try {
      const resP = await api.get('/api/pipelines')
      const funis = resP.data || []
      setPipelines(funis)
      
      if (funis.length > 0) {
        if (!activePipeline) setActivePipeline(funis[0])
      } else {
        // Se não houver funis, podemos sugerir criar um ou criar um padrão aqui
      }

      const resL = await api.get('/api/leads?limit=1000')
      setLeads(resL.data.leads || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('leadId', leadId)
  }

  const handleDrop = async (e, stageId) => {
    const leadId = e.dataTransfer.getData('leadId')
    try {
      // Otimismo na UI
      setLeads(leads.map(l => l.id === leadId ? { ...l, pipeline_stage_id: stageId } : l))
      await api.put(`/api/leads/${leadId}`, { pipeline_stage_id: stageId })
      // Se a etapa tiver um nome reconhecido como status clássico, atualizamos o status também
      const stage = activePipeline.pipeline_stages.find(s => s.id === stageId)
      if (stage) {
        // Mapeamento simples de nome para status clássico para manter compatibilidade
        const statusMap = { 'novo': 'novo', 'contatado': 'contatado', 'respondeu': 'respondeu', 'negociação': 'em_negociacao', 'fechado': 'fechado' }
        const mappedStatus = Object.keys(statusMap).find(k => stage.name.toLowerCase().includes(k))
        if (mappedStatus) await api.put(`/api/leads/${leadId}`, { status: statusMap[mappedStatus] })
      }
    } catch (err) { alert('Erro ao mover lead') }
  }

  const adicionarEtapa = async () => {
    const nome = prompt('Nome da nova etapa:')
    if (!nome) return
    try {
      const pos = activePipeline.pipeline_stages.length + 1
      await api.post(`/api/pipelines/${activePipeline.id}/stages`, { name: nome, position: pos })
      carregarTudo()
    } catch (err) { alert('Erro ao criar etapa') }
  }

  const renomearEtapa = async (stageId, antigo) => {
    const novo = prompt('Novo nome da etapa:', antigo)
    if (!novo || novo === antigo) return
    try {
      await api.put(`/api/pipelines/stages/${stageId}`, { name: novo })
      carregarTudo()
    } catch (err) { alert('Erro ao renomear') }
  }

  const criarFunil = async () => {
    const nome = prompt('Nome do novo funil (ex: Vendas SAP):')
    if (!nome) return
    try {
      setLoading(true)
      await api.post('/api/pipelines', { name: nome })
      carregarTudo()
    } catch (err) { alert('Erro ao criar funil') }
    finally { setLoading(false) }
  }

  const S = {
    layout: { display: 'flex', height: '100vh', background: '#080c10', color: '#fff' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { padding: '20px 30px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    kanban: { flex: 1, display: 'flex', gap: '20px', padding: '20px 30px', overflowX: 'auto', alignItems: 'flex-start' },
    column: { minWidth: '300px', width: '300px', background: '#0d131a', borderRadius: '6px', display: 'flex', flexDirection: 'column', maxHeight: '100%' },
    colHeader: (color) => ({ padding: '15px', borderBottom: `2px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }),
    card: { background: 'var(--bg2)', border: '1px solid var(--border)', padding: '15px', borderRadius: '4px', cursor: 'grab', marginBottom: '10px', position: 'relative' },
    temp: (t) => ({ width: '4px', height: '100%', position: 'absolute', left: 0, top: 0, background: t === 'quente' ? 'var(--red)' : t === 'morno' ? 'var(--orange)' : '#445566' }),
    empty: { padding: '40px', textAlign: 'center', opacity: 0.3, border: '1px dashed var(--border)', borderRadius: '4px' }
  }

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Carregando funis...</div>

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.header}>
          <div>
            <h1 style={{ fontSize: '18px' }}>🚀 Funis de Negociação</h1>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
              <select 
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '3px', color: 'var(--blue-bright)', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
                value={activePipeline?.id || ''}
                onChange={(e) => setActivePipeline(pipelines.find(p => p.id === e.target.value))}
              >
                <option value="">— Selecionar Funil —</option>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button 
                onClick={criarFunil} 
                style={{ background: 'transparent', border: '1px solid var(--blue-bright)', color: 'var(--blue-bright)', padding: '2px 8px', fontSize: '10px', borderRadius: '3px', fontWeight: 'bold' }}
              >
                ＋ NOVO FUNIL
              </button>
            </div>
          </div>
          <button 
            onClick={adicionarEtapa} 
            disabled={!activePipeline}
            style={{ 
              padding: '8px 15px', 
              background: activePipeline ? 'var(--blue-bright)' : '#223344', 
              border: 'none', 
              color: activePipeline ? '#fff' : '#667788', 
              borderRadius: '4px', 
              cursor: activePipeline ? 'pointer' : 'not-allowed', 
              fontWeight: 'bold' 
            }}
          >
            ＋ NOVA ETAPA
          </button>
        </div>

        <div style={S.kanban}>
          {!activePipeline && (
            <div style={{ ...S.empty, margin: '40px auto', width: '300px', opacity: 1 }}>
              <h2 style={{ fontSize: '16px', color: 'var(--blue-bright)' }}>Nenhum Funil Ativo</h2>
              <p style={{ fontSize: '12px', marginTop: '10px' }}>Selecione um funil no menu acima ou crie um novo para começar.</p>
              <button onClick={criarFunil} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--blue-bright)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>CRIAR MEU PRIMEIRO FUNIL</button>
            </div>
          )}
          {activePipeline?.pipeline_stages?.sort((a,b) => a.position - b.position).map(stage => {
            const leadsNaEtapa = leads.filter(l => l.pipeline_stage_id === stage.id)
            return (
              <div 
                key={stage.id} 
                style={S.column}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div style={S.colHeader(stage.color)} onClick={() => renomearEtapa(stage.id, stage.name)}>
                  <span style={{ fontWeight: '700', fontSize: '12px' }}>{stage.name.toUpperCase()}</span>
                  <span style={{ opacity: 0.5, fontSize: '11px' }}>{leadsNaEtapa.length}</span>
                </div>
                
                <div style={{ padding: '15px', overflowY: 'auto' }}>
                  {leadsNaEtapa.map(lead => (
                    <div 
                      key={lead.id} 
                      style={S.card}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => window.location.href = `/leads?id=${lead.id}`}
                    >
                      <div style={S.temp(lead.temperature)} />
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>{lead.name}</div>
                        {lead.connection_degree && (
                          <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderRadius: '4px', fontWeight: 'bold' }}>
                            {lead.connection_degree}º Grau
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{lead.company || lead.headline}</div>
                      
                      {/* ⏱️ INDICADOR DE TEMPO NA ETAPA (AGING) */}
                      <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--blue)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⏱️</span>
                        <span>
                          {(() => {
                            const entrada = new Date(lead.stage_entered_at || lead.created_at);
                            const dias = Math.floor((new Date() - entrada) / (1000 * 60 * 60 * 24));
                            if (dias === 0) return 'Entrou hoje';
                            if (dias === 1) return 'Há 1 dia';
                            return `Há ${dias} dias`;
                          })()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {leadsNaEtapa.length === 0 && <div style={S.empty}>Arraste leads aqui</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
