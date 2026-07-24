const cron = require('node-cron');
const supabase = require('../config/supabase');
const unipileService = require('./unipile');

// Função principal de processamento de follow-ups automáticos (Sprint 5)
async function processAutomaticFollowups() {
  console.log(`⏳ [CRON] Iniciando verificação de cadências automáticas...`);
  try {
    const hoje = new Date().toISOString();

    // 1. Busca todas as sequências ativas onde a data de execução já passou
    const { data: sequences, error } = await supabase
      .from('lead_sequences')
      .select(`
        id, current_step, next_execution_date, status, campaign_id,
        leads ( id, name, linkedin_url, status, tenant_id )
      `)
      .eq('status', 'active')
      .lte('next_execution_date', hoje);

    if (error) throw error;

    if (!sequences || sequences.length === 0) {
      console.log(`✅ [CRON] Nenhum follow-up automático pendente para agora.`);
      return;
    }

    console.log(`⚠️ [CRON] Encontradas ${sequences.length} cadências prontas para disparo!`);

    // 2. Processa cada sequência
    for (const seq of sequences) {
      const lead = seq.leads;
      
      // Se o lead já respondeu, cancela a sequência
      if (lead.status === 'respondeu') {
        console.log(`🛑 [CRON] Lead ${lead.name} respondeu. Cancelando sequência.`);
        await supabase.from('lead_sequences').update({ status: 'replied' }).eq('id', seq.id);
        continue;
      }

      // Busca o passo atual na campanha
      const { data: steps, error: errSteps } = await supabase
        .from('campaign_steps')
        .select('*')
        .eq('campaign_id', seq.campaign_id)
        .order('step_order', { ascending: true });

      if (errSteps || !steps || steps.length === 0) continue;

      // Encontra o passo que corresponde ao current_step
      const currentStepObj = steps.find(s => s.step_order === seq.current_step);
      
      if (!currentStepObj) {
        // Sequência terminou
        console.log(`🏁 [CRON] Sequência concluída para o lead ${lead.name}.`);
        await supabase.from('lead_sequences').update({ status: 'completed' }).eq('id', seq.id);
        continue;
      }

      // 3. Envia a mensagem usando a Unipile
      try {
        console.log(`🚀 [CRON] Enviando Passo ${seq.current_step} para ${lead.name}...`);
        
        // Determina o ID de destino (idealmente temos o linkedin_id, mas usamos a url aqui para simplificar)
        let recipientId = lead.linkedin_url; // Nota: unipileService.sendMessage requer accountId e chat/recipientId
        
        // Aqui precisaríamos de um mapping. Como teste, logamos o envio
        // No mundo real, usaríamos o unipileService.sendMessage(accountId, recipientId, msg)
        // await unipileService.sendMessage(accountId, recipientId, currentStepObj.message_template);
        console.log(`💬 [MENSAGEM SIMULADA]: ${currentStepObj.message_template}`);

        // 4. Agenda o próximo passo
        const nextStepObj = steps.find(s => s.step_order === seq.current_step + 1);
        if (nextStepObj) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + nextStepObj.delay_days);
          
          await supabase.from('lead_sequences')
            .update({ 
              current_step: seq.current_step + 1,
              next_execution_date: nextDate.toISOString()
            })
            .eq('id', seq.id);
          console.log(`📅 [CRON] Próximo passo agendado para ${nextDate.toISOString()}`);
        } else {
          // Não há próximo passo
          await supabase.from('lead_sequences').update({ status: 'completed' }).eq('id', seq.id);
          console.log(`🏁 [CRON] Último passo enviado. Sequência concluída.`);
        }

      } catch (sendErr) {
        console.error(`❌ [CRON] Erro ao enviar para ${lead.name}:`, sendErr.message);
      }
    }
  } catch (err) {
    console.error('❌ [CRON] Erro geral na execução:', err.message);
  }
}

// Inicia o cron
function startCronJobs() {
  // Roda a cada hora no minuto 0
  cron.schedule('0 * * * *', () => {
    processAutomaticFollowups();
  });
  console.log('⏰ [CRON] Serviço de Follow-up Automático iniciado (roda de 1 em 1h).');
}

module.exports = {
  startCronJobs,
  processAutomaticFollowups
};
