const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * UNIPILE SERVICE — Cromosit IT Prospector
 * Dual-Key System: LinkedIn & WhatsApp
 */
class UnipileService {
  constructor() {
    this.baseUrl = process.env.UNIPILE_URL || 'https://api38.unipile.com:16821/api/v1';
    this.keys = {
      LINKEDIN: process.env.UNIPILE_API_KEY_LINKEDIN,
      WHATSAPP: process.env.UNIPILE_API_KEY_WHATSAPP
    };
  }

  // 1. Criar um Link de Conexão (Usa chave específica por tipo)
  async createConnectLink(typeParam, userIdParam) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // GARANTIA: Se o primeiro parâmetro parecer um ID (UUID), nós invertemos.
    let type = typeParam;
    let userId = userIdParam;
    
    if (typeParam && typeParam.includes('-') && typeParam.length > 20) {
      type = userIdParam;
      userId = typeParam;
    }

    // Pega a chave certa para o tipo (LINKEDIN ou WHATSAPP)
    const apiKey = this.keys[type] || this.keys.LINKEDIN;

    console.log(`\n🔑 [DEBUG] Gerando link Unipile:`);
    console.log(`   - Provedor: ${type}`);
    console.log(`   - ID Usuário: ${userId}`);
    console.log(`   - Chave: ${apiKey ? apiKey.substring(0, 10) + '...' : '❌ NÃO CARREGADA'}`);

    try {
      const expiresOn = new Date();
      expiresOn.setHours(expiresOn.getHours() + 24); 

      const response = await axios.post(`${this.baseUrl}/hosted/accounts/link`, {
        type: 'create',
        providers: [type], 
        api_url: this.baseUrl,
        expiresOn: expiresOn.toISOString(),
        success_redirect_url: `${frontendUrl}/integrations?status=success`,
        failure_redirect_url: `${frontendUrl}/integrations?status=error`,
        notify_url: `${backendUrl}/api/unipile/callback/${userId}`,
        name: type // Usamos o tipo no nome para facilitar o callback
      }, {
        headers: { 'X-API-KEY': apiKey }
      });
      return response.data;
    } catch (error) {
      const errorMsg = `[${new Date().toISOString()}] ❌ Unipile Error (${type}): ${error.response?.data ? JSON.stringify(error.response.data) : error.message}\n`;
      fs.appendFileSync(path.join(__dirname, '../unipile_debug.log'), errorMsg);
      console.error(errorMsg);
      throw error;
    }
  }

  // ... (outros métodos usam accountId que já está vinculado à conta/tipo correto na Unipile) ...
  async sendMessage(accountId, recipientId, text) {
    // Para envio, a Unipile já sabe qual conta/chave usar internamente pelo accountId
    // mas usaremos a chave mestre (LinkedIn) por padrão ou a que estiver no .env
    const apiKey = process.env.UNIPILE_API_KEY_LINKEDIN || this.keys.LINKEDIN;
    try {
      const response = await axios.post(`${this.baseUrl}/chats/messages`, {
        account_id: accountId,
        attendees_ids: [recipientId],
        text: text
      }, {
        headers: { 'X-API-KEY': apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Unipile Error (Send Message):', error.response?.data || error.message);
      throw error;
    }
  }

  async listChats(accountId) {
    const apiKey = process.env.UNIPILE_API_KEY_LINKEDIN || this.keys.LINKEDIN;
    try {
      const response = await axios.get(`${this.baseUrl}/chats`, {
        params: { account_id: accountId },
        headers: { 'X-API-KEY': apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Unipile Error (List Chats):', error.response?.data || error.message);
      throw error;
    }
  }

  // 4. Listar todas as contas conectadas (LinkedIn/WhatsApp)
  async listAccounts() {
    const items = [];
    
    // Tenta buscar contas do LinkedIn
    if (this.keys.LINKEDIN) {
      try {
        const res = await axios.get(`${this.baseUrl}/accounts`, {
          headers: { 'X-API-KEY': this.keys.LINKEDIN }
        });
        if (res.data.items) items.push(...res.data.items);
      } catch (e) { console.error('❌ Erro ao listar contas LinkedIn:', e.message); }
    }

    // Tenta buscar contas do WhatsApp
    if (this.keys.WHATSAPP) {
      try {
        const res = await axios.get(`${this.baseUrl}/accounts`, {
          headers: { 'X-API-KEY': this.keys.WHATSAPP }
        });
        if (res.data.items) items.push(...res.data.items);
      } catch (e) { console.error('❌ Erro ao listar contas WhatsApp:', e.message); }
    }

    return { items };
  }
}

module.exports = new UnipileService();
