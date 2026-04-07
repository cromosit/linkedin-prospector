// Leads.jsx — VERSÃO v1.0 MASTER (LIVRE DE v5.10 LIXO) — CROMOSIT IT
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])

  useEffect(() => { carregarLeads() }, [busca])

  const carregarLeads = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/leads?search=${busca}`)
      setLeads(res.data.leads || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const deletarSelecionados = async () => {
    if (!window.confirm(`Deseja realmente excluir ${selectedLeads.length} leads?`)) return;
    try {
      await Promise.all(selectedLeads.map(id => api.delete(`/api/leads/${id}`)));
      alert('Leads excluídos com sucesso!');
      setSelectedLeads([]);
      carregarLeads();
    } catch (err) { alert('Erro ao excluir leads'); }
  }

  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#090e14', color: '#ecf0f1', fontFamily: 'Inter, sans-serif' },
    main: { flex: 1, padding: '0px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    topBar: { background: '#0c1219', padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '2px solid #1e3a8a' },
    btnTool: { background: '#121922', border: '1px solid #233142', color: '#8899aa', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
    btnDelete: { background: '#450a0a', border: '1px solid #991b1b', color: '#f87171', padding: '6px 15px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
    searchArea: { background: '#0e151d', padding: '10px 20px', display: 'flex', gap: '15px', alignItems: 'center', borderBottom: '1px solid #1c2633' },
    tableHeader: { padding: '10px 20px', display: 'grid', gridTemplateColumns: '50px 1.5fr 1fr 1fr 120px 60px 100px 80px 180px', background: '#0c1219', borderBottom: '1px solid #1e3a8a', fontSize: '10px', fontWeight: 'bold', color: '#445566', textTransform: 'uppercase' },
    row: { padding: '15px 20px', display: 'grid', gridTemplateColumns: '50px 1.5fr 1fr 1fr 120px 60px 100px 80px 180px', borderBottom: '1px solid #111827', alignItems: 'center' },
    badgeGrau: { background: '#0f172a', color: '#3b82f6', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', border: '1px solid #1e3a8a', fontWeight: 'bold' },
    statusSelect: { background: '#0f172a', border: '1px solid #1e293b', color: '#fff', padding: '5px', borderRadius: '4px', fontSize: '12px' },
    iaBadge: { background: '#facc1522', color: '#facc15', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #facc1544' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        {/* TOP BAR EXATA v1.0 (REMOVIDO LIXO v5.10) */}
        <div style={S.topBar}>
           <div style={{background: '#2563eb', color: '#fff', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', borderRadius: '2px'}}>LP</div>
           <span style={{fontWeight:'bold', fontSize:'13px', marginLeft: '5px'}}>Prospector</span>
           <div style={{width: '1px', height: '20px', background: '#1c2633', margin: '0 10px'}}></div>
           <span style={{fontSize:'13px', fontWeight:'bold', marginRight:'10px'}}>Leads ({leads.length})</span>
           <button style={S.btnTool} onClick={() => window.location.reload()}>↺ ATUALIZAR</button>
           <button style={S.btnTool}>↓ EXPORTAR</button>
           <button style={S.btnTool}>⚙️ CONFIG</button>
           {selectedLeads.length > 0 && <button style={S.btnDelete} onClick={deletarSelecionados}>🗑️ Excluir Selecionados ({selectedLeads.length})</button>}
           <div style={{flex:1}}></div>
           <span style={{fontSize:'11px', color:'#445566'}}>48 leads | Pág. 1/3</span>
        </div>

        {/* BUSCA E FILTROS SAP */}
        <div style={S.searchArea}>
           <div style={{flex: 1, display:'flex', alignItems:'center', background:'#070b10', border:'1px solid #1c2633', padding:'4px 10px', borderRadius:'4px'}}>
              <span style={{marginRight:'10px'}}>🔍</span>
              <input style={{background:'transparent', border:'none', color:'#fff', width:'100%', fontSize:'13px'}} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar leads..." />
           </div>
           <select style={{background:'#0c1219', border:'1px solid #1c2633', color:'#fff', padding:'6px 12px', fontSize:'13px', borderRadius:'4px'}}><option>Todos os status</option></select>
           <select style={{background:'#0c1219', border:'1px solid #1c2633', color:'#fff', padding:'6px 12px', fontSize:'13px', borderRadius:'4px'}}><option>Temperatura</option></select>
        </div>

        {/* TABELA v1.0 COM CHECKBOXES */}
        <div style={S.tableHeader}>
           <input type="checkbox" onChange={() => setSelectedLeads(selectedLeads.length === leads.length ? [] : leads.map(l => l.id))} checked={selectedLeads.length > 0 && selectedLeads.length === leads.length} />
           <span>LEAD</span>
           <span>EMPRESA / LOCAL</span>
           <span>CONTATO / ZAP</span>
           <span>GRAU</span>
           <span>SCORE</span>
           <span>STATUS</span>
           <span>TEMP.</span>
           <span>AÇÕES</span>
        </div>

        <div style={{flex: 1, overflowY: 'auto'}}>
          {loading ? <div style={{padding:'20px'}}>Carregando ambiente v1.0...</div> : leads.map(l => (
            <div key={l.id} style={S.row}>
               <input type="checkbox" checked={selectedLeads.includes(l.id)} onChange={() => setSelectedLeads(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])} />
               <div>
                  <div style={{color:'#fff', fontWeight:'bold', fontSize:'13px'}}>{l.name}</div>
                  <div style={{color:'#445566', fontSize:'11px'}}>{l.headline || '—'}</div>
               </div>
               <div>
                  <div style={{color:'#be185d', fontSize:'12px'}}>📍 <span style={{color: '#8899aa'}}>{l.location || '—'}</span></div>
               </div>
               <div style={{display:'flex', gap:'10px'}}>
                  <span style={{color: '#3b82f6'}}>📧</span>
                  <span style={{color: '#be185d'}}>📞</span>
                  <span style={{color: '#22c55e'}}>💬</span>
               </div>
               <div><span style={S.badgeGrau}>{l.degree || '3º Fora da rede'}</span></div>
               <div style={{color:'#445566'}}>{l.score || '—'}</div>
               <div>
                  <select style={S.statusSelect} value={l.status || 'Novo'}><option>Novo</option><option>Em Contato</option></select>
               </div>
               <div style={{display:'flex', alignItems:'center', gap:'5px', color:'#f97316', fontSize:'12px', fontWeight:'bold'}}>⚡ Morno</div>
               <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <span style={{color: '#3b82f6', fontSize:'11px', fontWeight:'bold'}}>— Editar / IA</span>
                  {l.id === leads[0]?.id && <span style={S.iaBadge}>✨ IA</span>}
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
