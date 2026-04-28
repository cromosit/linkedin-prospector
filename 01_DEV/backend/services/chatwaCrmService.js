const axios = require('axios');

// Configurações (podem ir para o .env no futuro)
const CHATWA_API_BASE = 'https://apichatwa.cromosit.com/api';
const CHATWA_EMAIL = 'suporte@cromosit.com.br';
const CHATWA_PASS = 'chatwa123';
const STAGE_ID_NOVO_LEAD = 24; // "Sem contato"

let cachedToken = null;
let tokenExpiresAt = 0;

class ChatwaCrmService {
  /**
   * Realiza login no ChatWA e guarda o token em memória.
   */
  async authenticate() {
    // Se temos um token válido (com margem de 5 minutos), reutiliza
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }

    try {
      const response = await axios.post(`${CHATWA_API_BASE}/auth/login`, {
        email: CHATWA_EMAIL,
        password: CHATWA_PASS
      });

      cachedToken = response.data.token;
      // Define a validade do token (geralmente dura algumas horas, mas vamos colocar 2h de cache)
      tokenExpiresAt = Date.now() + (2 * 60 * 60 * 1000); 
      return cachedToken;
    } catch (error) {
      console.error('❌ [ChatWA CRM] Erro na autenticação:', error.message);
      throw new Error('Falha ao autenticar no ChatWA');
    }
  }

  /**
   * Formata o número de telefone para o padrão DDI + DDD + Número sem caracteres especiais
   */
  formatNumber(phone) {
    if (!phone) return null;
    let number = String(phone).replace(/\D/g, '');
    if (!number) return null;
    // Assume DDI 55 (Brasil) se não vier
    if (!number.startsWith('55') && number.length <= 11) {
      number = '55' + number;
    }
    return number;
  }

  /**
   * Busca um contato pelo número
   */
  async getContactByNumber(number) {
    const token = await this.authenticate();
    try {
      // Endpoint padrão Whaticket para buscar contato
      const response = await axios.get(`${CHATWA_API_BASE}/contacts`, {
        params: { searchParam: number, pageNumber: 1 },
        headers: { Authorization: `Bearer ${token}` }
      });

      const contacts = response.data.contacts || [];
      // Tenta achar correspondência exata
      const contact = contacts.find(c => c.number === number);
      return contact || (contacts.length > 0 ? contacts[0] : null);
    } catch (error) {
      console.error('⚠️ [ChatWA CRM] Erro ao buscar contato:', error.message);
      return null;
    }
  }

  /**
   * Cria um novo contato no ChatWA
   */
  async createContact(name, number) {
    const token = await this.authenticate();
    try {
      const response = await axios.post(`${CHATWA_API_BASE}/contacts`, {
        name: name,
        number: number,
        email: '',
        extraInfo: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('❌ [ChatWA CRM] Erro ao criar contato:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Cria um Negócio (Deal) no Funil Kanban do ChatWA
   */
  async createDeal(title, contactId, stageId) {
    const token = await this.authenticate();
    try {
      const payload = {
        title: title || 'Lead do Prospector',
        contactId: contactId,
        stageId: stageId,
        status: 'OPEN',
        value: 0
      };

      const response = await axios.post(`${CHATWA_API_BASE}/crm/deals`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ [ChatWA CRM] Negócio criado com sucesso: "${title}" (ID: ${response.data.id})`);
      return response.data;
    } catch (error) {
      console.error('❌ [ChatWA CRM] Erro ao criar negócio:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Ponto de entrada principal: Sincroniza o lead capturado para o Funil
   */
  async syncLeadToFunnel(lead) {
    try {
      if (!lead.phone) {
        console.log(`⏭️ [ChatWA CRM] Ignorando sincronização para "${lead.name}": Sem número de telefone.`);
        return null;
      }

      const formattedNumber = this.formatNumber(lead.phone);
      if (!formattedNumber) return null;

      console.log(`🔄 [ChatWA CRM] Iniciando sincronização do lead: ${lead.name} (${formattedNumber})`);

      // 1. Busca ou cria o contato
      let contact = await this.getContactByNumber(formattedNumber);
      
      if (!contact) {
        console.log(`➕ [ChatWA CRM] Contato não existe. Criando contato para ${formattedNumber}...`);
        contact = await this.createContact(lead.name, formattedNumber);
      } else {
        console.log(`✅ [ChatWA CRM] Contato encontrado (ID: ${contact.id})`);
      }

      if (!contact || !contact.id) {
        throw new Error('Não foi possível obter ou criar o contato no ChatWA.');
      }

      // 2. Cria o Negócio (Deal) na coluna "Sem contato" (Stage 24)
      const dealTitle = `${lead.name} - ${lead.company || 'LinkedIn'}`;
      const deal = await this.createDeal(dealTitle, contact.id, STAGE_ID_NOVO_LEAD);

      return deal;
    } catch (error) {
      console.error('❌ [ChatWA CRM] Erro na sincronização:', error.message);
      return null;
    }
  }
}

module.exports = new ChatwaCrmService();
