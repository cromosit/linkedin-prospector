import { task } from "@trigger.dev/sdk/v3";
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { notifySalesWhatsapp } from "./notifications";

// Configuração do Supabase (reutilizando variáveis de ambiente)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export const processLeadProspecting = task({
  id: "process-lead-prospecting",
  retry: {
    limit: 5,
    delay: "30s",
  },
  run: async (payload: { id: string; updates: any; userId: string }) => {
    const { id, updates, userId } = payload;
    
    console.log(`[Trigger] Processando lead ${id} do usuário ${userId}`);

    // 1. Atualizar lead no Supabase de forma resiliente
    const { data: lead, error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[Trigger] Erro ao salvar no Supabase`, error);
      throw new Error(`Falha no banco de dados: ${error.message}`);
    }

    console.log(`[Trigger] Lead ${id} salvo com sucesso!`);

    // 2. Notificação Inteligente (Novo Passo)
    if (lead && lead.name) {
       await notifySalesWhatsapp.trigger({
          leadName: lead.name,
          company: lead.current_company || lead.company || 'não informada',
          role: lead.current_role || lead.headline || 'não informado',
          phone: lead.phone || ''
       });
    }

    // 3. Enriquecimento IA (Opcional)

    return { success: true, leadId: lead.id };
  },
});
