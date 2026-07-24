import Sidebar from '../components/Sidebar'

export default function CadastroLeads() {
  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: '#070b10', color: '#ecf0f1', fontFamily: 'Inter, sans-serif' },
    main: { flex: 1, padding: '0px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    topBar: { background: '#0c1219', padding: '15px 20px', borderBottom: '2px solid #1e3a8a', display: 'flex', alignItems: 'center', gap: '10px' },
    body: { padding: '40px', display: 'flex', justifyContent: 'center' },
    card: { background: '#0c1219', width: '800px', borderRadius: '8px', border: '1px solid #1c2633', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    header: { background: '#121922', padding: '20px', borderBottom: '1px solid #1e3a8a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    content: { padding: '30px' },
    sectionLabel: { color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px', display: 'block', borderLeft: '4px solid #3b82f6', paddingLeft: '15px' },
    inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' },
    field: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '11px', color: '#445566', fontWeight: 'bold', textTransform: 'uppercase' },
    input: { background: '#070b10', border: '1px solid #1c2633', color: '#fff', padding: '10px', borderRadius: '4px', fontSize: '14px', outline: 'none' },
    inputBlue: { background: '#070b10', border: '1px solid #2563eb', color: '#fff', padding: '10px', borderRadius: '4px', fontSize: '14px', outline: 'none' },
    btnSave: { background: '#2563eb', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }
  }

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.topBar}>
          <div style={{background:'#2563eb', color:'#fff', width:'24px', height:'24px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'10px'}}>💎</div>
          <span style={{fontWeight:'bold', fontSize:'14px'}}>Cadastro de Leads (Sincronizado)</span>
        </div>
        
        <div style={S.body}>
          <div style={S.card}>
            <div style={S.header}>
              <span style={{fontWeight:'bold', color:'#fff', fontSize:'16px'}}>📂 Novo Cadastro Master</span>
              <button style={S.btnSave} onClick={() => alert('Pronto para salvar no Samuel-Host!')}>✓ SALVAR AGORA</button>
            </div>
            
            <div style={S.content}>
               <span style={S.sectionLabel}>DADOS DO LINKEDIN</span>
               <div style={S.inputGroup}>
                  <div style={S.field}><label style={S.label}>NOME DO LEAD</label><input style={S.input} placeholder="Ex: Rogério Peres" /></div>
                  <div style={S.field}><label style={S.label}>EMPRESA ATUAL</label><input style={S.inputBlue} placeholder="Ex: IBM" /></div>
                  <div style={S.field}><label style={S.label}>LOCALIZAÇÃO</label><input style={S.input} placeholder="Curitiba, PR, Brasil" /></div>
                  <div style={S.field}><label style={S.label}>URL PERFIL</label><input style={S.input} placeholder="linkedin.com/in/..." /></div>
               </div>

               <span style={S.sectionLabel}>CONTATO E CONECTIVIDADE</span>
               <div style={S.inputGroup}>
                  <div style={S.field}><label style={S.label}>E-MAIL CORPORATIVO</label><input style={S.inputBlue} placeholder="exemplo@gmail.com" /></div>
                  <div style={S.field}><label style={S.label}>WHATSAPP / TELEFONE</label><input style={S.inputBlue} placeholder="(41) 99999-9999" /></div>
                  <div style={S.field}><label style={S.label}>SITE DA EMPRESA</label><input style={S.input} placeholder="empresa.com.br" /></div>
                  <div style={S.field}><label style={S.label}>ANIVERSÁRIO</label><input style={S.input} placeholder="8 de junho" /></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
