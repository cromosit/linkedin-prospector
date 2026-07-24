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
      let daysToAdd = 3;
      let title = '';

      if (nextStep === 1) {
        title = '📞 Follow-up 1: Verificar interesse (Dia 3)';
        daysToAdd = 3;
      } else if (nextStep === 2) {
        title = '📞 Follow-up 2: Re-enviar proposta / Prova Social (Dia 7)';
        daysToAdd = 4;
      } else if (nextStep === 3) {
        title = '📞 Follow-up 3: Mensagem de "Despedida" (Break-up) (Dia 14)';
        daysToAdd = 7;
      } else if (nextStep === 4) {
        title = '📞 Follow-up 4: Nutrição de Conteúdo Mensal (Dia 30)';
        daysToAdd = 16;
      } else if (nextStep === 5) {
        title = '📞 Follow-up 5: Reaproximação Trimestral (Dia 90)';
        daysToAdd = 60;
      } else if (nextStep === 6) {
        title = '📞 Follow-up 6: Reaproximação Semestral (Dia 180)';
        daysToAdd = 90;
      } else if (nextStep === 7) {
        title = '📞 Follow-up 7: Reaproximação Anual (Dia 365)';
        daysToAdd = 185;
      } else {
        return;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      dueDate.setHours(10, 0, 0, 0);

      const { error: taskError } = await supabase.from('tasks').insert({
        user_id: userId,
        lead_id: leadId,
        title: title,
        due_date: dueDate.toISOString(),
        priority: nextStep === 1 ? 'alta' : 'media',
        status: 'pendente'
      });

      if (taskError) throw taskError;

      const updateData = {
        cadence_step: nextStep,
        next_followup_at: dueDate.toISOString(),
        updated_at: new Date().toISOString()
      };

      if (nextStep === 1) {
        updateData.status = 'contatado';
        updateData.contacted_at = new Date().toISOString();
      }

      await supabase.from('leads').update(updateData).eq('id', leadId);

      console.log(`✅ [CADENCIA] Passo ${nextStep} agendado para lead ${leadId} em ${dueDate.toLocaleDateString()}`);
      
    } catch (err) {
      console.error('❌ [CADENCIA] Erro ao agendar passo:', err.message);
    }
  },

  async pausarCadencia(leadId) {
    try {
      await supabase
        .from('tasks')
        .delete()
        .eq('lead_id', leadId)
        .eq('status', 'pendente');

      await supabase
        .from('leads')
        .update({
          next_followup_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      console.log(`✅ [CADENCIA] Cadência pausada e tarefas limpas para o lead ${leadId}`);
    } catch (err) {
      console.error('❌ [CADENCIA] Erro ao pausar cadência:', err.message);
    }
  }
};

module.exports = CadenceService;
