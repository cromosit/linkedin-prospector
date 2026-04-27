const supabase = require('../config/supabase');

/**
 * Serviço de Cadência de Mensagens - Cromosit IT
 * Gerencia a criação automática de tarefas de follow-up
 */
const CadenceService = {
  
  /**
   * Agenda o próximo passo da cadência para um lead
   * @param {string} leadId - ID do lead
   * @param {string} userId - ID do usuário (vendedor)
   * @param {number} currentStep - Passo atual (0, 1, 2...)
   */
  async agendarProximoPasso(leadId, userId, currentStep) {
    try {
      const nextStep = currentStep + 1;
      let daysToAdd = 3; // Padrão 3 dias para o primeiro follow-up
      let title = '';

      if (nextStep === 1) {
        title = '📞 Follow-up 1: Verificar interesse';
        daysToAdd = 3;
      } else if (nextStep === 2) {
        title = '📞 Follow-up 2: Re-enviar proposta / Prova Social';
        daysToAdd = 4; // 3 + 4 = 7 dias do contato inicial
      } else if (nextStep === 3) {
        title = '📞 Follow-up 3: Mensagem de "Despedida" (Break-up)';
        daysToAdd = 7; // 14 dias do contato inicial
      } else {
        return; // Fim da cadência padrão
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      dueDate.setHours(10, 0, 0, 0); // Sempre agendar para as 10h da manhã

      // 1. Cria a tarefa no banco
      const { error: taskError } = await supabase.from('tasks').insert({
        user_id: userId,
        lead_id: leadId,
        title: title,
        due_date: dueDate.toISOString(),
        priority: nextStep === 1 ? 'alta' : 'media',
        status: 'pendente'
      });

      if (taskError) throw taskError;

      // 2. Atualiza o passo da cadência no lead e o status de contato
      const updateData = {
        cadence_step: nextStep,
        next_followup_at: dueDate.toISOString(),
        updated_at: new Date().toISOString()
      };

      // Se for o primeiro contato, muda o status e marca a data
      if (nextStep === 1) {
        updateData.status = 'contatado';
        updateData.contacted_at = new Date().toISOString();
      }

      await supabase.from('leads').update(updateData).eq('id', leadId);

      console.log(`✅ [CADENCIA] Passo ${nextStep} agendado para lead ${leadId} em ${dueDate.toLocaleDateString()}`);
      
    } catch (err) {
      console.error('❌ [CADENCIA] Erro ao agendar passo:', err.message);
    }
  }
};

module.exports = CadenceService;
