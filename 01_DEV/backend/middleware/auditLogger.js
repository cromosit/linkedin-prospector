const supabase = require('../config/supabase');

/**
 * Registra uma ação no banco de dados para fins de auditoria (Marco Civil da Internet).
 * Esta função roda de forma assíncrona para não travar a requisição do usuário.
 * 
 * @param {Object} req - O objeto request do Express
 * @param {String} action - Nome da ação (ex: 'LOGIN', 'DELETE_CAMPAIGN')
 * @param {String} entityType - Tipo da entidade afetada (ex: 'user', 'campaign')
 * @param {String} entityId - ID da entidade afetada (opcional)
 * @param {Object} metadata - Dados adicionais em JSON (opcional)
 */
const logAudit = (req, action, entityType = null, entityId = null, metadata = {}) => {
  // Pega o ID do usuário se estiver autenticado pelo middleware de auth
  const userId = req.user ? req.user.userId : null;
  
  // Extrai o IP (Suporte para proxies como Vercel/Railway)
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  // Extrai o User-Agent (Navegador/Sistema)
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Grava no banco sem esperar (Fire and Forget)
  supabase.from('audit_logs').insert({
    user_id: userId,
    action: action,
    entity_type: entityType,
    entity_id: entityId,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: metadata
  }).then(({ error }) => {
    if (error) {
      console.error(`❌ [AUDIT LOG ERROR] Falha ao gravar log para a ação ${action}:`, error.message);
    }
  });
};

module.exports = { logAudit };
