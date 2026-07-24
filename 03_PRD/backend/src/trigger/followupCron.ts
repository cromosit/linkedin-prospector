import { schedules } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import axios from 'axios';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const CHATWA_URL = 'https://apichatwa.cromosit.com/api/messages/send';
const CHATWA_TOKEN = process.env.CHATWA_TOKEN || '';

export const followupCron = schedules.task({
  id: "followup-cron",
  // Roda todos os dias às 10:00 AM (BRT) -> 13:00 UTC
  cron: "0 13 * * *", 
  run: async (payload) => {
    console.log(`[Follow-up Cron] Iniciando verificação de tarefas vencidas.`);
    
    const today = new Date().toISOString();
    
    // Busca tarefas pendentes que já passaram da data de due_date e são Follow-ups
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*, leads(*)')
      .eq('status', 'pendente')
      .lte('due_date', today)
      .ilike('title', '%Follow-up%');
      
    if (taskError) {
      console.error("[Follow-up Cron] Erro ao buscar tarefas no Supabase:", taskError);
      return;
    }
    
    if (!tasks || tasks.length === 0) {
      console.log("[Follow-up Cron] Nenhuma tarefa de follow-up pendente encontrada hoje.");
      return;
    }
    
    console.log(`[Follow-up Cron] Encontradas ${tasks.length} tarefas para processar.`);
    
    for (const task of tasks) {
      const lead = task.leads;
      if (!lead) continue;
      
      // REGRA: Só faz follow-up automático se o lead continua no status 'contatado'
      if (lead.status !== 'contatado') {
        console.log(`[Follow-up Cron] Lead ${lead.name} não está mais 'contatado' (status atual: ${lead.status}). Cancelando follow-up e marcando tarefa como concluída.`);
        await supabase.from('tasks').update({ status: 'concluida' }).eq('id', task.id);
        continue;
      }
      
      // REGRA: Sem telefone, deixa a tarefa manual para o SDR enviar no LinkedIn
      if (!lead.phone) {
        console.log(`[Follow-up Cron] Lead ${lead.name} não possui telefone. Deixando tarefa pendente para o vendedor acionar manualmente via LinkedIn Inbox.`);
        continue;
      }
      
      console.log(`[Follow-up Cron] Processando envio de Follow-up para Lead: ${lead.name} (${lead.phone}).`);
      
      // GERAÇÃO DE MENSAGEM VIA OpenAI (dinâmica, baseada no passo)
      let mensagem = '';
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");
        
        const promptContexto = `Nome do lead: ${lead.name}\nCargo: ${lead.current_role || lead.headline}\nEmpresa: ${lead.current_company || lead.company}`;
        
        const openaiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Você é um SDR experiente B2B. Escreva uma mensagem de FOLLOW-UP extremamente curta (máximo 2 frases) para o WhatsApp, em português BR. O objetivo é perguntar de forma leve se a pessoa conseguiu ver sua mensagem anterior sobre consultoria/hunting SAP/TI. Seja sutil, sem ser chato. Comece chamando pelo primeiro nome." },
            { role: "user", content: promptContexto }
          ]
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        mensagem = openaiRes.data.choices[0].message.content.replace(/"/g, '').trim();
      } catch (err) {
        console.error(`[Follow-up Cron] Erro ao gerar mensagem IA para ${lead.name}. Usando fallback.`, err.message);
        const primeiroNome = lead.name.split(' ')[0];
        mensagem = `Olá ${primeiroNome}, tudo bem? Conseguiu dar uma olhada rápida na minha última mensagem? Um abraço!`;
      }
      
      // ENVIO VIA CHATWA
      try {
        await axios.post(
          CHATWA_URL,
          { number: lead.phone, body: mensagem },
          { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHATWA_TOKEN}` } }
        );
        
        console.log(`[Follow-up Cron] ✅ Mensagem enviada para ${lead.name} via WhatsApp.`);
        
        // Registrar atividade no CRM
        await supabase.from('activities').insert({
          lead_id: lead.id,
          user_id: task.user_id,
          type: 'follow_up',
          description: `Follow-up Automático (Dia ${lead.cadence_step || 1}) via WhatsApp: ${mensagem}`
        });
        
        // Marcar tarefa atual como concluída
        await supabase.from('tasks').update({ status: 'concluida' }).eq('id', task.id);
        
        // Agendar próximo passo da cadência importando o serviço localmente
        const currentStep = lead.cadence_step || 1;
        const CadenceService = require('../../services/cadenceService');
        await CadenceService.agendarProximoPasso(lead.id, task.user_id, currentStep);
        
      } catch (err) {
        console.error(`[Follow-up Cron] ❌ Erro ao enviar via ChatWA para ${lead.name}:`, err.response?.data || err.message);
        // Opcional: não atualizar a task para que o cron tente amanhã de novo, ou atualizar com 'erro'
      }
    }
    
    console.log(`[Follow-up Cron] Verificação diária finalizada.`);
  }
});
