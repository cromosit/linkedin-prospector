const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Recebe webhooks do ChatWA (ex: quando um card muda de coluna no Kanban)
router.post('/chatwa', async (req, res) => {
  try {
    const payload = req.body;
    console.log('🔔 [WEBHOOK CHATWA] Recebido:', JSON.stringify(payload, null, 2));

    // Exemplo de payload esperado quando um deal muda de coluna no Whaticket/ChatWA:
    // { event: 'deal.update', deal: { id: 123, contactId: 45, stageId: 26, status: 'OPEN', contact: { number: '5511999999999' } } }
    
    // A estrutura exata do Webhook do ChatWA pode variar. 
    // Vamos fazer um parser defensivo:
    const event = payload.event || payload.type;
    const deal = payload.deal || payload.data;
    
    if (event === 'deal.update' && deal && deal.contact && deal.contact.number) {
      const phone = deal.contact.number;
      const stageId = deal.stageId;
      
      // Mapeamento Inverso (ChatWA -> Prospector)
      const reverseStageMap = {
        24: 'novo',
        25: 'contatado',
        26: 'respondeu',
        27: 'em_negociacao',
        28: 'fechado',
        29: 'descartado'
      };
      
      const newStatus = reverseStageMap[stageId];
      
      if (newStatus) {
        // Busca o lead no Prospector pelo telefone (com e sem o '55' caso não haja formatação exata)
        const phoneWithoutCountry = phone.startsWith('55') ? phone.substring(2) : phone;
        
        const { data: leads, error } = await supabase
          .from('leads')
          .select('id, name')
          .or(`phone.eq.${phone},phone.eq.${phoneWithoutCountry},phone.like.%${phoneWithoutCountry}%`);
          
        if (error) {
          console.error('❌ [WEBHOOK] Erro ao buscar lead por telefone no DB:', error.message);
        } else if (leads && leads.length > 0) {
          // Atualiza o status de todos os leads encontrados com esse telefone
          for (const lead of leads) {
            await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
            console.log(`✅ [WEBHOOK] Lead ${lead.name} atualizado para status '${newStatus}' via ChatWA Webhook!`);
            
            // Pausar cadência se mudou para respondeu/fechado/etc
            const statusDeParada = ['respondeu', 'em_negociacao', 'fechado', 'descartado'];
            if (statusDeParada.includes(newStatus)) {
              const CadenceService = require('../services/cadenceService');
              await CadenceService.pausarCadencia(lead.id);
            }
          }
        } else {
          console.log(`⚠️ [WEBHOOK] Lead com telefone ${phone} não encontrado no Prospector.`);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ [WEBHOOK CHATWA] Erro ao processar:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
