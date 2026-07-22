import React, { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';

export default function AiTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Teste e Sugestões da IA
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState('');
  const [sugerindo, setSugerindo] = useState(false);

  // Form State
  const [classificacao, setClassificacao] = useState('');
  const [funilEtapa, setFunilEtapa] = useState('conexao');
  const [instrucaoPrompt, setInstrucaoPrompt] = useState('');
  const [templateTexto, setTemplateTexto] = useState('');

  const ETAPAS = {
    'conexao': 'Topo de Funil (Primeiro Contato / Conexão)',
    'follow_up_1': 'Meio de Funil (Follow-up 1)',
    'fechamento': 'Fundo de Funil (Fechamento / Reunião)'
  };

  useEffect(() => {
    carregarTemplates();
  }, []);

  const carregarTemplates = async () => {
    try {
      const res = await api.get('/api/ai-templates');
      setTemplates(res.data || []);
      setLoading(false);
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      alert(`Erro ao carregar os templates: ${msg}`);
      setLoading(false);
    }
  };

  const salvarTemplate = async () => {
    if (!classificacao || !funilEtapa || !instrucaoPrompt) {
      alert('Preencha os campos obrigatórios (Grupo, Etapa e Instrução).');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/api/ai-templates', {
        classificacao,
        funil_etapa: funilEtapa,
        instrucao_prompt: instrucaoPrompt,
        template_texto: templateTexto
      });
      alert('Regra salva com sucesso!');
      
      // Limpa os campos
      setClassificacao('');
      setFunilEtapa('conexao');
      setInstrucaoPrompt('');
      setTemplateTexto('');
      setShowForm(false);
      carregarTemplates();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      alert(`Erro ao salvar o template: ${msg}`);
    } finally {
      setSalvando(false);
    }
  };

  const excluirTemplate = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;
    try {
      await api.delete(`/api/ai-templates/${id}`);
      carregarTemplates();
    } catch (error) {
      alert('Erro ao excluir o template.');
    }
  };
  
  const testarIA = async () => {
    if (!instrucaoPrompt) {
      alert('Preencha a instrução da IA antes de testar.');
      return;
    }
    setTestando(true);
    setResultadoTeste('');
    try {
      const res = await api.post('/api/ai-templates/test', {
        classificacao,
        funil_etapa: ETAPAS[funilEtapa] || funilEtapa,
        instrucao_prompt: instrucaoPrompt,
        template_texto: templateTexto
      });
      setResultadoTeste(res.data.mensagem);
    } catch (error) {
      const msgErro = error.response?.data?.detalhe || error.response?.data?.error || error.message;
      alert(`Erro ao testar a IA: ${msgErro}`);
    } finally {
      setTestando(false);
    }
  };

  const sugerirIA = async () => {
    if (!classificacao) {
      alert('Preencha ou selecione um Grupo/Classificação alvo primeiro.');
      return;
    }
    setSugerindo(true);
    try {
      const res = await api.post('/api/ai-templates/suggest', {
        classificacao,
        funil_etapa: ETAPAS[funilEtapa] || funilEtapa
      });
      if (res.data.instrucao_prompt) {
        setInstrucaoPrompt(res.data.instrucao_prompt);
      }
      if (res.data.template_texto) {
        setTemplateTexto(res.data.template_texto);
      }
    } catch (error) {
      const msgErro = error.response?.data?.detalhe || error.response?.data?.error || error.message;
      alert(`Erro ao buscar sugestão da IA: ${msgErro}`);
    } finally {
      setSugerindo(false);
    }
  };

  // ─── ESTILOS IDÊNTICOS AO LEADS.JSX ─────────────────────────────────
  const S = {
    layout:   { display: 'flex', minHeight: '100vh', background: '#0b1118', color: '#fff' },
    main:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    toolbar:  { padding: '15px 20px', background: '#121922', borderBottom: '1px solid #233142', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
    content:  { padding: '24px 30px', flex: 1, overflow: 'auto' },
    card:     { background: '#121922', border: '1px solid #233142', borderRadius: '6px', padding: '20px', marginBottom: '20px' },
    input:    { width: '100%', background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '10px 14px', borderRadius: '4px', fontSize: '13px', outline: 'none', marginBottom: '15px' },
    select:   { width: '100%', background: '#0b1118', border: '1px solid #233142', color: '#fff', padding: '10px 14px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', outline: 'none', marginBottom: '15px' },
    label:    { color: '#8899aa', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '6px', letterSpacing: '0.05em' },
    btnPrimary: (color) => ({ padding: '8px 16px', background: `${color}15`, border: `1px solid ${color}`, color, borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }),
    title:    { fontSize: '18px', fontWeight: '600', marginBottom: '5px' },
    subtitle: { fontSize: '13px', color: '#8899aa', marginBottom: '20px' },
    badge:    { display: 'inline-block', background: 'var(--blue-bright)', color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }
  };

  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>
        {/* TOOLBAR */}
        <div style={S.toolbar}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🤖 Templates de IA Inteligentes
            </h2>
            <div style={{ fontSize: '12px', color: '#8899aa', marginTop: '4px' }}>
              Ensine a IA a escrever de forma diferente para cada Grupo (Ex: Gerente de TI vs RH)
            </div>
          </div>
          
          {!showForm && (
            <button style={S.btnPrimary('#00c896')} onClick={() => setShowForm(true)}>
              ＋ Nova Regra de IA
            </button>
          )}
        </div>

        <div style={S.content}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#8899aa', marginTop: '50px' }}>Carregando regras...</div>
          ) : (
            <>
              {/* FORMULÁRIO DE NOVA REGRA */}
              {showForm && (
                <div style={{ ...S.card, border: '1px solid #1d8fe840' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #233142', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#1d8fe8', fontSize: '16px' }}>Configurar Nova Inteligência</h3>
                    <button style={{ background: 'transparent', color: '#8899aa', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setShowForm(false)}>✕</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={S.label}>GRUPO / CLASSIFICAÇÃO ALVO *</label>
                      <input 
                        style={{ ...S.input, marginBottom: '8px' }} 
                        placeholder="Ex: Gerente de TI" 
                        value={classificacao}
                        onChange={e => setClassificacao(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '15px' }}>
                        <span style={{ fontSize: '11px', color: '#8899aa', marginTop: '4px' }}>Sugestões:</span>
                        {['Gerente de TI', 'RH / Tech Recruiter', 'Consultor Funcional', 'Diretoria / C-Level'].map(sug => (
                          <button
                            key={sug}
                            style={{ background: '#1c2633', border: '1px solid #233142', color: '#8899aa', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', cursor: 'pointer' }}
                            onClick={() => setClassificacao(sug)}
                            type="button"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={S.label}>ETAPA DO FUNIL *</label>
                      <select style={S.select} value={funilEtapa} onChange={e => setFunilEtapa(e.target.value)}>
                        {Object.entries(ETAPAS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ ...S.label, marginBottom: 0 }}>INSTRUÇÃO PARA A IA (COMO ABORDAR?) *</label>
                    <button 
                      style={{ background: 'transparent', border: '1px solid #1d8fe880', color: '#1d8fe8', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={sugerirIA}
                      disabled={sugerindo}
                    >
                      {sugerindo ? '⏳ Pensando...' : '✨ Sugerir com IA'}
                    </button>
                  </div>
                  <textarea 
                    style={{ ...S.input, height: '80px', resize: 'vertical' }}
                    placeholder="Ex: O lead é um Diretor de TI. O foco é alocação ágil de SAP. Fale sobre a dificuldade de fechar posições..."
                    value={instrucaoPrompt}
                    onChange={e => setInstrucaoPrompt(e.target.value)}
                  />

                  <label style={S.label}>TEMPLATE DE TEXTO EXATO (Opcional - Use apenas se quiser forçar uma estrutura exata)</label>
                  <textarea 
                    style={{ ...S.input, height: '80px', resize: 'vertical' }}
                    placeholder={'Ex: ${saudacaoTempo} ${primeiroNome}, vi que a ${empresa} está com vagas...'}
                    value={templateTexto}
                    onChange={e => setTemplateTexto(e.target.value)}
                  />
                  
                  {/* CAIXA DE PREVIEW DA IA */}
                  {resultadoTeste && (
                    <div style={{ background: '#080c10', border: '1px solid #00c89650', borderRadius: '4px', padding: '15px', marginBottom: '20px' }}>
                      <div style={{ fontSize: '10px', color: '#00c896', fontWeight: 'bold', marginBottom: '8px' }}>🤖 PREVIEW GERADO PELA IA:</div>
                      <div style={{ fontSize: '13px', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {resultadoTeste}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button style={S.btnPrimary('#ff9f0a')} onClick={testarIA} disabled={testando}>
                      {testando ? '⏳ Testando...' : '🧪 Testar Regra Agora'}
                    </button>
                    <button style={S.btnPrimary('#00c896')} onClick={salvarTemplate} disabled={salvando}>
                      {salvando ? '⏳ Salvando...' : '✓ Salvar Regra Definitiva'}
                    </button>
                    <button style={{ ...S.btnPrimary('#8899aa'), border: 'none' }} onClick={() => setShowForm(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA DE REGRAS EXISTENTES */}
              {templates.length === 0 && !showForm ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#8899aa', background: '#121922', borderRadius: '6px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '15px' }}>🧠</div>
                  <h3 style={{ color: '#fff', marginBottom: '8px' }}>Sua IA ainda não tem regras personalizadas</h3>
                  <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 20px' }}>
                    Ensine a IA a mandar mensagens perfeitas baseadas no cargo e na etapa do funil dos seus leads.
                  </p>
                  <button style={S.btnPrimary('#1d8fe8')} onClick={() => setShowForm(true)}>
                    Criar Primeira Regra
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {templates.map(t => (
                    <div key={t.id} style={S.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={S.badge}>{t.classificacao}</span>
                            <span style={{ fontSize: '12px', color: '#8899aa' }}>• {ETAPAS[t.funil_etapa] || t.funil_etapa}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#fff', marginBottom: '10px', lineHeight: '1.5' }}>
                            <strong style={{ color: '#1d8fe8' }}>Instrução:</strong> {t.instrucao_prompt}
                          </div>
                          {t.template_texto && (
                            <div style={{ fontSize: '12px', color: '#8899aa', background: '#080c10', padding: '10px', borderRadius: '4px' }}>
                              <strong>Template Forçado:</strong> <br/>
                              {t.template_texto}
                            </div>
                          )}
                        </div>
                        <button 
                          style={{ ...S.btnPrimary('#ff3b5c'), padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => excluirTemplate(t.id)}
                        >
                          🗑 Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
