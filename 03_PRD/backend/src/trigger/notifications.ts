import { task } from "@trigger.dev/sdk/v3";
import axios from 'axios';

const CHATWA_URL = 'https://apichatwa.cromosit.com/api/messages/send';
const CHATWA_TOKEN = process.env.CHATWA_TOKEN || 'HiYooAHPQI66uey1HJj0YWkYPq6BWyIB';

export const notifySalesWhatsapp = task({
  id: "notify-sales-whatsapp",
  run: async (payload: { leadName: string; company: string; role: string; phone: string }) => {
    const vendedorPhone = process.env.VENDEDOR_WHATSAPP;
    
    if (!vendedorPhone) {
      console.error("VENDEDOR_WHATSAPP não configurado no .env");
      return;
    }

    const mensagem = `🚀 *NOVO LEAD CAPTURADO!*\n\n` +
      `👤 *Nome:* ${payload.leadName}\n` +
      `🏢 *Empresa:* ${payload.company}\n` +
      `💼 *Cargo:* ${payload.role}\n` +
      `📞 *WhatsApp:* ${payload.phone || 'Não extraído'}\n\n` +
      `Acesse o painel para gerar a mensagem de abordagem personalizada!`;

    try {
      await axios.post(
        CHATWA_URL,
        { number: vendedorPhone, body: mensagem },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHATWA_TOKEN}` } }
      );
      console.log(`[Notification] Vendedor notificado sobre o lead ${payload.leadName}`);
    } catch (error) {
      console.error("[Notification] Erro ao enviar WhatsApp", error);
      throw error; // Trigger.dev vai tentar novamente (retry)
    }
  },
});
