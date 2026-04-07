import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';

const STATUS_OPTIONS = ['novo', 'qualificado', 'contatado', 'proposta', 'fechado', 'perdido'];
const TEMP_COLORS = { quente: '#ef4444', morno: '#f97316', frio: '#3b82f6' };
const TEMP_BG = { quente: 'rgba(239,68,68,0.12)', morno: 'rgba(249,115,22,0.12)', frio: 'rgba(59,130,246,0.12)' };
const GRAU_LABEL = { '1': '1º · Conexão direta', '2': '2º · Amigo do amigo', '3': '3º · Sem conexão' };
const STATUS_ICONS = { novo: '🆕', qualificado: '⭐', contatado: '📨', proposta: '📄', fechado: '✅', perdido: '❌' };

// ── Gerador de mensagem IA (local, sem custo de API) ──────────────────────
function gerarMensagemIA(lead) {
  const nome = (lead.name || '').split(' ')[0];
  const cargo = lead.headline || lead.current_position || '';
  const empresa = lead.current_company || lead.company || '';
  const grau = lead.connection_degree || '2';
  if (grau === '1') {
    return `Olá ${nome}, tudo bem?\n\nVi o seu perfil e fiquei impressionado com a sua trajetória${cargo ? ` em ${cargo}` : ''}${empresa ? ` na ${empresa}` : ''}.\n\nSou da Cromosit IT e trabalhamos com capacitação SAP e alocação de talentos tech. Podemos conversar rapidinho?\n\nAbraço,\nSamuel — Cromosit IT`;
  }
  return `Olá ${nome}! Vi que atuamos em áreas complementares.${cargo ? ` Sua experiência em ${cargo} é exatamente o perfil que buscamos para nossas iniciativas de capacitação SAP.` : ''} Gostaria de conectar e trocar experiências! 🤝`;
}

// ── Tempo relativo ────────────────────────────────────────────────────────
function tempoRelativo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const dias = Math.floor(hrs / 24);
  if (dias === 1) return 'ontem';
  return `${dias}d atrás`;
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTemp, setFilterTemp] = useState('');
  const [filterGrau, setFilterGrau] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgIA, setMsgIA] = useState('');
  const [mostrarMsg, setMostrarMsg] = useState(false);

  // ── FEATURE 1: Seleção em massa ────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deletando, setDeletando] = useState(false);

  // ── FEATURE 2/3: Histórico de mensagens ────────────────────────────────
  const [messageHistory, setMessageHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState('all'); // 'all', 'whatsapp', 'linkedin'
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (filterTemp) params.append('temperature', filterTemp);
      if (filterGrau) params.append('connection_degree', filterGrau);
      const res = await api.get(`/leads?${params}`);
      setLeads(res.data.leads || res.data || []);
      setTotal(res.data.pagination?.total || (res.data.leads || res.data || []).length);
    } catch (err) { console.error('Erro ao buscar leads:', err); }
    finally { setLoading(false); }
  }, [page, search, filterStatus, filterTemp, filterGrau]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { const t = setInterval(fetchLeads, 30000); return () => clearInterval(t); }, [fetchLeads]);

  // ── Buscar histórico de mensagens do lead selecionado ───────────────────
  const fetchHistory = useCallback(async (leadId) => {
    if (!leadId) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/leads/${leadId}/messages`);
      setMessageHistory(res.data.messages || []);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      setMessageHistory([]);
    } finally { setLoadingHistory(false); }
  }, []);

  // ── Salvar mensagem no histórico ────────────────────────────────────────
  const salvarMensagemHistorico = async (leadId, channel, message) => {
    try {
      await api.post(`/leads/${leadId}/messages`, { channel, message });
      // Atualiza o lead localmente
      setLeads(prev => prev.map(l => l.id === leadId ? {
        ...l,
        status: 'contatado',
        last_contacted_at: new Date().toISOString(),
        last_contact_channel: channel
      } : l));
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => ({ ...prev, status: 'contatado', last_contacted_at: new Date().toISOString(), last_contact_channel: channel }));
        fetchHistory(leadId);
      }
    } catch (err) { console.error('Erro ao salvar histórico:', err); }
  };

  // ── FEATURE 1: Toggle de seleção ───────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };
  const deletarSelecionados = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} lead(s)? Esta ação não pode ser desfeita.`)) return;
    setDeletando(true);
    try {
      await api.post('/leads/bulk-delete', { ids: Array.from(selectedIds) });
      setLeads(prev => prev.filter(l => !selectedIds.has(l.id)));
      setTotal(prev => prev - selectedIds.size);
      if (selectedLead && selectedIds.has(selectedLead.id)) setSelectedLead(null);
      setSelectedIds(new Set());
      setMsg(`✅ ${selectedIds.size} leads excluídos!`);
    } catch (err) { setMsg('❌ Erro ao excluir leads'); }
    finally { setDeletando(false); }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get('/leads?limit=5000');
      const all = res.data.leads || res.data || [];
      const headers = ['Nome', 'Cargo', 'Empresa', 'Email', 'Telefone', 'Localização', 'LinkedIn', 'Status', 'Temperatura', 'Grau', 'Score'];
      const rows = all.map(l => [l.name, l.headline, l.company, l.email, l.phone, l.location, l.linkedin_url, l.status, l.temperature, l.connection_degree, l.score].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `leads_cromosit_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    } catch (err) { alert('Erro ao exportar CSV'); }
  };

  const atualizarStatus = async (id, status) => {
    try {
      await api.put(`/leads/${id}`, { status });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (err) { console.error('Erro ao atualizar status:', err); }
  };

  const abrirLead = (lead) => {
    setSelectedLead(lead);
    setEditData({ ...lead });
    setEditMode(false);
    setMsg('');
    setMsgIA(gerarMensagemIA(lead));
    setMostrarMsg(false);
    setHistoryTab('all');
    fetchHistory(lead.id);
  };

  const salvarEdicao = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/leads/${selectedLead.id}`, editData);
      const updated = res.data.lead || res.data;
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      setSelectedLead(updated);
      setEditMode(false);
      setMsg('✅ Lead salvo com sucesso!');
    } catch (err) { setMsg('❌ Erro ao salvar'); }
    finally { setSaving(false); }
  };

  // ── FEATURE 4: Enriquecer com IA ────────────────────────────────────────
  const enriquecerIA = async (id) => {
    setMsg('🤖 Enriquecendo com IA...');
    try {
      const res = await api.post(`/leads/${id}/enriquecer`);
      const updated = res.data.lead || res.data;
      if (updated?.id) {
        setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
        setSelectedLead(updated);
        setMsgIA(gerarMensagemIA(updated));
      }
      setMsg('✅ Lead enriquecido com IA!');
    } catch (err) { setMsg('❌ IA indisponível. Configure OPENAI_API_KEY no .env'); }
  };

  // ── Gerar mensagem via IA avançada do backend ───────────────────────────
  const gerarMensagemIAAvancada = async (lead, tipo = 'primeiro_contato') => {
    setMsg('🤖 Gerando mensagem personalizada...');
    try {
      const res = await api.post(`/leads/${lead.id}/gerar-mensagem`, { tipo });
      if (res.data.mensagem) {
        setMsgIA(res.data.mensagem);
        setMostrarMsg(true);
        setMsg('✅ Mensagem IA gerada!');
      }
    } catch (err) { setMsg('❌ IA indisponível. Usando mensagem local.'); }
  };

  // ── FEATURE 5: Enviar via LinkedIn Inbox (com histórico + status) ──────
  const enviarLinkedIn = (lead, tipoAcao = 'send_message') => {
    if (!lead.linkedin_url) { setMsg('❌ URL do LinkedIn não encontrada'); return; }
    const urlBase = lead.linkedin_url.endsWith('/') ? lead.linkedin_url : lead.linkedin_url + '/';
    const mensagem = encodeURIComponent(msgIA);
    const urlFinal = `${urlBase}?lp_msg=${mensagem}&lp_action=${tipoAcao}`;
    window.open(urlFinal, '_blank');
    // Salva no histórico + atualiza status
    salvarMensagemHistorico(lead.id, 'linkedin', msgIA);
    setMsg('✅ LinkedIn aberto + mensagem salva no histórico!');
  };

  // ── FEATURE 5: Enviar via WhatsApp (com histórico + status) ────────────
  const enviarWhatsApp = (lead) => {
    if (!lead.phone) { setMsg('⚠️ Sem telefone cadastrado. Use Enriquecer IA ou LEVA 2 para capturar.'); return; }
    const phone = lead.phone.replace(/\D/g, '');
    const phoneCompleto = phone.startsWith('55') ? phone : '55' + phone;
    const texto = encodeURIComponent(msgIA);
    window.open(`https://wa.me/${phoneCompleto}?text=${texto}`, '_blank');
    // Salva no histórico + atualiza status
    salvarMensagemHistorico(lead.id, 'whatsapp', msgIA);
    setMsg('✅ WhatsApp aberto + mensagem salva no histórico!');
  };

  const copiarMensagem = () => {
    navigator.clipboard.writeText(msgIA).then(() => setMsg('✅ Mensagem copiada!'));
  };

  // ── Filtrar histórico por tab ───────────────────────────────────────────
  const filteredHistory = historyTab === 'all'
    ? messageHistory
    : messageHistory.filter(m => m.channel === historyTab);

  // ══════════════════════════════════════════════════════════════════════════
  // ESTILOS
  // ══════════════════════════════════════════════════════════════════════════
  const S = {
    layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' },
    main: { flex: 1, padding: '28px 32px', overflowX: 'hidden' },
    topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' },
    title: { fontSize: '22px', fontWeight: '800', letterSpacing: '-0.03em' },
    subtitle: { color: 'var(--text2)', fontSize: '12px', marginTop: '2px' },
    btnBar: { display: 'flex', gap: '8px', alignItems: 'center' },
    btn: (color) => ({ padding: '8px 16px', background: color || 'var(--bg3)', border: '1px solid var(--border)', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap', transition: 'all 0.15s' }),
    filterBar: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
    input: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontSize: '13px', borderRadius: '4px', outline: 'none', flex: 1, minWidth: '180px' },
    select: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', outline: 'none' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '12px 14px', textAlign: 'left', color: 'var(--text2)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
    td: { padding: '12px 14px', borderBottom: '1px solid var(--border2)', verticalAlign: 'middle' },
    badge: (temp) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: TEMP_BG[temp] || 'var(--bg3)', color: TEMP_COLORS[temp] || 'var(--text2)', textTransform: 'capitalize' }),
    grauBadge: { display: 'inline-block', padding: '3px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', color: 'var(--text2)' },
    actionBtn: (color) => ({ padding: '5px 10px', background: color ? color + '20' : 'var(--bg3)', border: `1px solid ${color || 'var(--border)'}`, color: color || 'var(--text2)', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }),
    statusSelect: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
    checkbox: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' },
    // BARRA DE SELEÇÃO
    selectBar: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '12px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' },
    // MODAL
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
    modal: { width: '540px', height: '100vh', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: '24px 28px', animation: 'fadeIn 0.2s ease' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
    modalTitle: { fontSize: '18px', fontWeight: '800', lineHeight: 1.2 },
    modalScore: { background: 'var(--blue)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', flexShrink: 0 },
    section: { marginBottom: '18px' },
    sectionTitle: { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '10px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' },
    fieldValue: { fontSize: '13px', color: 'var(--text)', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '7px 10px', borderRadius: '4px', wordBreak: 'break-all', minHeight: '32px' },
    fieldInput: { fontSize: '13px', color: 'var(--text)', background: 'var(--bg)', border: '1px solid #3b82f6', padding: '7px 10px', borderRadius: '4px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    actionCard: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px', marginBottom: '12px' },
    actionCardTitle: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', marginBottom: '10px' },
    bigBtn: (color) => ({ flex: 1, padding: '10px 12px', background: color, border: 'none', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }),
    textarea: { width: '100%', minHeight: '90px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px', borderRadius: '4px', fontSize: '12px', lineHeight: '1.5', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' },
    // TABS
    tab: (active) => ({ padding: '6px 14px', fontSize: '11px', fontWeight: '700', borderRadius: '4px', cursor: 'pointer', border: 'none', background: active ? 'rgba(59,130,246,0.2)' : 'transparent', color: active ? '#60a5fa' : 'var(--text2)', transition: 'all 0.15s' }),
    // HISTÓRICO ITEM
    historyItem: { borderLeft: '2px solid var(--border)', paddingLeft: '12px', marginBottom: '12px' },
    channelBadge: (ch) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: '700', background: ch === 'whatsapp' ? 'rgba(37,211,102,0.15)' : 'rgba(10,102,194,0.15)', color: ch === 'whatsapp' ? '#25d366' : '#0a66c2', marginRight: '6px' }),
  };

  const Field = ({ label, value, field, full }) => (
    <div style={full ? { ...S.fieldGroup, gridColumn: '1 / -1' } : S.fieldGroup}>
      <div style={S.label}>{label}</div>
      {editMode
        ? <input style={S.fieldInput} value={editData[field] || ''} onChange={e => setEditData(p => ({ ...p, [field]: e.target.value }))} />
        : <div style={S.fieldValue}>{value || <span style={{ color: 'var(--text3)' }}>—</span>}</div>
      }
    </div>
  );

  return (
    <div style={S.layout}>
      <Sidebar />
      <main style={S.main}>
        {/* TOPBAR */}
        <div style={S.topbar}>
          <div>
            <div style={S.title}>Gestão de Leads</div>
            <div style={S.subtitle}>{total} leads no banco · Atualização a cada 30s</div>
          </div>
          <div style={S.btnBar}>
            <button style={S.btn()} onClick={fetchLeads}>↻ Atualizar</button>
            <button style={S.btn()} onClick={exportCSV}>↓ Exportar CSV</button>
            <button style={S.btn()} onClick={() => { setFilterStatus(''); setFilterTemp(''); setFilterGrau(''); setSearch(''); }}>✕ Limpar</button>
          </div>
        </div>

        {/* FILTROS */}
        <div style={S.filterBar}>
          <input style={S.input} placeholder="Buscar por nome, empresa ou cargo..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <select style={S.select} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select style={S.select} value={filterTemp} onChange={e => { setFilterTemp(e.target.value); setPage(1); }}>
            <option value="">Temperatura</option>
            <option value="quente">🔥 Quente</option>
            <option value="morno">🌡 Morno</option>
            <option value="frio">❄️ Frio</option>
          </select>
          <select style={S.select} value={filterGrau} onChange={e => { setFilterGrau(e.target.value); setPage(1); }}>
            <option value="">Grau de Conexão</option>
            <option value="1">1º Grau</option>
            <option value="2">2º Grau</option>
            <option value="3">3º Grau</option>
          </select>
        </div>

        {/* TABELA */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text2)' }}>Carregando leads...</div>
          ) : leads.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text2)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              <div>Nenhum lead encontrado. Capture leads pelo LinkedIn!</div>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {/* CHECKBOX HEADER */}
                  <th style={{ ...S.th, width: '40px' }}>
                    <input
                      type="checkbox"
                      style={S.checkbox}
                      checked={selectedIds.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      title="Selecionar todos"
                    />
                  </th>
                  <th style={S.th}>Nome / Cargo</th>
                  <th style={S.th}>Empresa / Local</th>
                  <th style={S.th}>Contato</th>
                  <th style={S.th}>Grau</th>
                  <th style={S.th}>Score</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Tema</th>
                  <th style={S.th}>Último contato</th>
                  <th style={S.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id}
                    style={{ cursor: 'pointer', background: selectedIds.has(lead.id) ? 'rgba(59,130,246,0.08)' : 'transparent' }}
                    onClick={() => abrirLead(lead)}
                    onMouseEnter={e => { if (!selectedIds.has(lead.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!selectedIds.has(lead.id)) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* CHECKBOX */}
                    <td style={S.td} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        style={S.checkbox}
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                      />
                    </td>
                    <td style={S.td}>
                      <div style={{ fontWeight: '700' }}>{lead.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{(lead.headline || lead.current_position || '').substring(0, 45)}</div>
                    </td>
                    <td style={S.td}>
                      <div style={{ color: 'var(--text2)' }}>{lead.current_company || lead.company || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{lead.location}</div>
                    </td>
                    <td style={S.td} onClick={e => e.stopPropagation()}>
                      <div style={{ color: 'var(--blue-bright)', fontSize: '12px' }}>{lead.email || '—'}</div>
                      <div style={{ color: 'var(--text2)', fontSize: '11px' }}>{lead.phone || 'Sem telefone'}</div>
                    </td>
                    <td style={S.td}>
                      <span style={S.grauBadge}>{GRAU_LABEL[lead.connection_degree] || `${lead.connection_degree}º`}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontWeight: '800', color: (lead.score || 0) > 70 ? 'var(--green)' : (lead.score || 0) > 40 ? 'var(--orange)' : 'var(--text2)' }}>
                        {lead.score || 0}
                      </span>
                    </td>
                    <td style={S.td} onClick={e => e.stopPropagation()}>
                      <select style={S.statusSelect} value={lead.status || 'novo'} onChange={e => atualizarStatus(lead.id, e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_ICONS[s] || ''} {s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(lead.temperature)}>
                        {lead.temperature === 'quente' ? '🔥' : lead.temperature === 'morno' ? '🌡' : '❄️'} {lead.temperature || 'frio'}
                      </span>
                    </td>
                    {/* ÚLTIMO CONTATO */}
                    <td style={S.td}>
                      {lead.last_contacted_at ? (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#22c55e' }}>{tempoRelativo(lead.last_contacted_at)}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
                            via {lead.last_contact_channel === 'whatsapp' ? '📱 WA' : '💬 LI'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>—</span>
                      )}
                    </td>
                    <td style={S.td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button style={S.actionBtn('#3b82f6')} onClick={() => abrirLead(lead)}>Editar</button>
                        <button style={S.actionBtn('#0a66c2')} title="LinkedIn Inbox" onClick={() => { abrirLead(lead); setMostrarMsg(true); }}>LI</button>
                        {lead.phone && <button style={S.actionBtn('#25d366')} onClick={() => { setMsgIA(gerarMensagemIA(lead)); enviarWhatsApp(lead); }}>WA</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINAÇÃO */}
        {total > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            <button style={S.btn()} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
            <span style={{ padding: '8px 16px', color: 'var(--text2)', fontSize: '13px' }}>Página {page} de {Math.ceil(total / 20)}</span>
            <button style={S.btn()} disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Próxima →</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            BARRA FLUTUANTE DE SELEÇÃO EM MASSA
        ═══════════════════════════════════════════════════════════ */}
        {selectedIds.size > 0 && (
          <div style={S.selectBar}>
            <span style={{ color: '#60a5fa', fontWeight: '700', fontSize: '13px' }}>
              ☑ {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
            </span>
            <button
              style={{ ...S.btn('#ef4444'), display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={deletarSelecionados}
              disabled={deletando}
            >
              {deletando ? '⏳ Excluindo...' : '🗑 Excluir selecionados'}
            </button>
            <button
              style={S.btn()}
              onClick={() => setSelectedIds(new Set())}
            >
              ✕ Limpar seleção
            </button>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          MODAL LATERAL DE DETALHE / EDIÇÃO
      ══════════════════════════════════════════════════ */}
      {selectedLead && (
        <div style={S.overlay} onClick={() => setSelectedLead(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>

            {/* HEADER */}
            <div style={S.modalHeader}>
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <div style={S.modalTitle}>{selectedLead.name}</div>
                <div style={{ color: 'var(--text2)', fontSize: '12px', marginTop: '4px' }}>
                  {selectedLead.current_position || selectedLead.headline}
                  {(selectedLead.current_company || selectedLead.company) && ` · ${selectedLead.current_company || selectedLead.company}`}
                </div>
                {/* STATUS BADGE + LAST CONTACT */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                    {STATUS_ICONS[selectedLead.status] || '🆕'} {(selectedLead.status || 'novo').charAt(0).toUpperCase() + (selectedLead.status || 'novo').slice(1)}
                  </span>
                  {selectedLead.last_contacted_at && (
                    <span style={{ fontSize: '11px', color: '#22c55e' }}>
                      · Último contato: {tempoRelativo(selectedLead.last_contacted_at)} via {selectedLead.last_contact_channel === 'whatsapp' ? '📱 WhatsApp' : '💬 LinkedIn'}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <span style={S.modalScore}>#{selectedLead.score || 0}</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }} onClick={() => setSelectedLead(null)}>✕</button>
              </div>
            </div>

            {/* AÇÕES PRINCIPAIS */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button style={S.btn('#7c3aed')} onClick={() => enriquecerIA(selectedLead.id)}>🤖 Enriquecer IA</button>
              {editMode
                ? <button style={S.btn('#22c55e')} onClick={salvarEdicao} disabled={saving}>{saving ? 'Salvando...' : '✔ Salvar'}</button>
                : <button style={S.btn()} onClick={() => setEditMode(true)}>✎ Editar</button>
              }
              {selectedLead.linkedin_url && (
                <button style={S.btn('#0a66c2')} onClick={() => window.open(selectedLead.linkedin_url, '_blank')}>↗ LinkedIn</button>
              )}
            </div>

            {/* CARD DE AÇÕES DE CONTATO */}
            <div style={S.actionCard}>
              <div style={S.actionCardTitle}>📨 Enviar Mensagem</div>

              {/* BOTÕES DE ENVIO */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button style={S.bigBtn('#0a66c2')} onClick={() => enviarLinkedIn(selectedLead, selectedLead.connection_degree === '1' ? 'send_message' : 'connect')}>
                  <span>💬</span>
                  {selectedLead.connection_degree === '1' ? 'LinkedIn Inbox' : 'Conectar no LinkedIn'}
                </button>
                <button
                  style={{ ...S.bigBtn('#25d366'), opacity: selectedLead.phone ? 1 : 0.5 }}
                  onClick={() => enviarWhatsApp(selectedLead)}
                  title={!selectedLead.phone ? 'Sem telefone — clique em Enriquecer IA' : ''}
                >
                  <span>📲</span> WhatsApp
                </button>
              </div>

              {/* BOTÕES DE MENSAGEM IA */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                <button style={{ ...S.btn('#7c3aed'), flex: 1, fontSize: '11px' }} onClick={() => gerarMensagemIAAvancada(selectedLead, 'primeiro_contato')}>
                  🤖 Gerar msg IA
                </button>
                <button style={{ ...S.btn('#7c3aed'), flex: 1, fontSize: '11px' }} onClick={() => gerarMensagemIAAvancada(selectedLead, 'follow_up')}>
                  🔄 Follow-up IA
                </button>
              </div>

              {/* BOTÃO MOSTRAR/EDITAR MENSAGEM */}
              <button
                onClick={() => setMostrarMsg(!mostrarMsg)}
                style={{ ...S.btn(), width: '100%', marginBottom: mostrarMsg ? '10px' : 0, justifyContent: 'center', display: 'flex' }}
              >
                {mostrarMsg ? '▲ Ocultar mensagem' : '▼ Ver / editar mensagem'}
              </button>

              {/* TEXTAREA DA MENSAGEM */}
              {mostrarMsg && (
                <>
                  <textarea
                    style={S.textarea}
                    value={msgIA}
                    onChange={e => setMsgIA(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button style={{ ...S.btn(), flex: 1 }} onClick={copiarMensagem}>📋 Copiar</button>
                    <button style={{ ...S.btn(), flex: 1 }} onClick={() => setMsgIA(gerarMensagemIA(selectedLead))}>↺ Regenerar local</button>
                  </div>
                </>
              )}
            </div>

            {/* FEEDBACK */}
            {msg && (
              <div style={{ padding: '10px 12px', background: msg.includes('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${msg.includes('❌') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: '4px', marginBottom: '14px', fontSize: '12px', color: msg.includes('❌') ? '#ef4444' : '#22c55e' }}>
                {msg}
              </div>
            )}

            {/* ══════════════════════════════════════════════
                SEÇÃO: HISTÓRICO DE MENSAGENS
            ══════════════════════════════════════════════ */}
            <div style={S.section}>
              <div style={S.sectionTitle}>📜 HISTÓRICO DE MENSAGENS</div>

              {/* TABS */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                <button style={S.tab(historyTab === 'all')} onClick={() => setHistoryTab('all')}>
                  Todos ({messageHistory.length})
                </button>
                <button style={S.tab(historyTab === 'linkedin')} onClick={() => setHistoryTab('linkedin')}>
                  💬 LinkedIn ({messageHistory.filter(m => m.channel === 'linkedin').length})
                </button>
                <button style={S.tab(historyTab === 'whatsapp')} onClick={() => setHistoryTab('whatsapp')}>
                  📱 WhatsApp ({messageHistory.filter(m => m.channel === 'whatsapp').length})
                </button>
              </div>

              {/* LISTA */}
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {loadingHistory ? (
                  <div style={{ color: 'var(--text3)', fontSize: '12px', padding: '8px' }}>Carregando...</div>
                ) : filteredHistory.length === 0 ? (
                  <div style={{ color: 'var(--text3)', fontSize: '12px', padding: '8px', textAlign: 'center' }}>
                    Nenhuma mensagem enviada ainda
                  </div>
                ) : (
                  filteredHistory.map((m, i) => (
                    <div key={m.id || i} style={S.historyItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <span style={S.channelBadge(m.channel)}>
                          {m.channel === 'whatsapp' ? '📱 WA' : '💬 LI'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text3)' }}>
                          {new Date(m.sent_at).toLocaleDateString('pt-BR')} às {new Date(m.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.4', whiteSpace: 'pre-line', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.message?.substring(0, 200)}{m.message?.length > 200 ? '...' : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SEÇÃO: IDENTIFICAÇÃO */}
            <div style={S.section}>
              <div style={S.sectionTitle}>IDENTIFICAÇÃO</div>
              <div style={S.grid2}>
                <Field label="Nome" value={editMode ? undefined : selectedLead.name} field="name" />
                <Field label="Máquina (Busca)" value={editMode ? undefined : selectedLead.search_info} field="search_info" />
                <Field label="Cargo Atual" value={editMode ? undefined : (selectedLead.current_position || selectedLead.headline)} field="current_position" />
                <Field label="Empresa Atual" value={editMode ? undefined : (selectedLead.current_company || selectedLead.company)} field="current_company" />
                <Field label="Empresa" value={editMode ? undefined : selectedLead.company} field="company" />
                <Field label="Localização" value={editMode ? undefined : selectedLead.location} field="location" />
                <Field label="URL do LinkedIn" value={editMode ? undefined : selectedLead.linkedin_url} field="linkedin_url" full />
              </div>
            </div>

            {/* SEÇÃO: INFORMAÇÕES DE CONTATO */}
            <div style={S.section}>
              <div style={S.sectionTitle}>INFORMAÇÕES DE CONTATO</div>
              <div style={S.grid2}>
                <Field label="Email" value={editMode ? undefined : selectedLead.email} field="email" />
                <Field label="Telefone / WhatsApp" value={editMode ? undefined : selectedLead.phone} field="phone" />
                <Field label="Website" value={editMode ? undefined : selectedLead.website} field="website" />
                <Field label="Aniversário" value={editMode ? undefined : selectedLead.birthday} field="birthday" />
                <Field label="Conectado desde" value={editMode ? undefined : selectedLead.connected_since} field="connected_since" />
                <Field label="Conexões em comum" value={editMode ? undefined : selectedLead.mutual_connections} field="mutual_connections" />
              </div>
            </div>

            {/* SEÇÃO: QUALIFICAÇÃO */}
            <div style={S.section}>
              <div style={S.sectionTitle}>QUALIFICAÇÃO</div>
              <div style={S.grid2}>
                <div style={S.fieldGroup}>
                  <div style={S.label}>Status</div>
                  {editMode
                    ? <select style={{ ...S.fieldInput, width: '100%' }} value={editData.status || 'novo'} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    : <div style={S.fieldValue}>{STATUS_ICONS[selectedLead.status] || '🆕'} {selectedLead.status || 'novo'}</div>
                  }
                </div>
                <div style={S.fieldGroup}>
                  <div style={S.label}>Temperatura</div>
                  <div style={{ ...S.fieldValue, color: TEMP_COLORS[selectedLead.temperature], background: TEMP_BG[selectedLead.temperature] }}>
                    {selectedLead.temperature === 'quente' ? '🔥' : selectedLead.temperature === 'morno' ? '🌡' : '❄️'} {selectedLead.temperature || 'frio'}
                  </div>
                </div>
                <Field label="Grau de Conexão" value={GRAU_LABEL[selectedLead.connection_degree] || `${selectedLead.connection_degree}º`} field="connection_degree" />
                <Field label="Score IA" value={selectedLead.score} field="score" />
              </div>
            </div>

            {/* SEÇÃO: ANÁLISE IA */}
            {(selectedLead.service_interest || selectedLead.notes || selectedLead.about) && (
              <div style={S.section}>
                <div style={S.sectionTitle}>🤖 ANÁLISE IA</div>
                {selectedLead.service_interest && (
                  <div style={{ ...S.fieldValue, marginBottom: '8px', lineHeight: '1.6' }}>
                    <strong>Interesse:</strong> {selectedLead.service_interest}
                  </div>
                )}
                {(selectedLead.notes || selectedLead.about) && (
                  <div style={{ ...S.fieldValue, whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                    {selectedLead.notes || selectedLead.about}
                  </div>
                )}
              </div>
            )}

            <div style={{ height: '40px' }} />
          </div>
        </div>
      )}
    </div>
  );
}
