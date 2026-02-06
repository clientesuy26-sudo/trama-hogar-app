'use server';

import { suggestComplementaryItems } from '@/ai/flows/suggest-complementary-items';
import { aiChatAssistance } from '@/ai/flows/ai-chat-assistance';
import type { Product, Extra, ChatMessage } from '@/types';
import { products, extrasCatalog } from './data';
import { z } from 'zod';
import { logEvent } from './logger';
import { getAndClearMessages } from '@/lib/chat-store';

const N8N_SEND_WEBHOOK_URL = process.env.N8N_SEND_WEBHOOK_URL;
const VENDOR_WHATSAPP_NUMBER = process.env.VENDOR_WHATSAPP_NUMBER;

// Schema for order payload
const OrderPayloadSchema = z.object({
    mainItem: z.object({
        name: z.string(),
        img: z.string().url(),
        quantity: z.number().min(1),
        subtotal: z.number(),
    }),
    extraItems: z.array(z.object({
        name: z.string(),
        img: z.string().url(),
        quantity: z.number().min(1),
        total: z.number(),
    })),
    shipping: z.object({
        method: z.enum(['envio', 'retiro']),
        cost: z.number(),
    }),
    total: z.number(),
});

type OrderPayload = z.infer<typeof OrderPayloadSchema>;

export async function sendOrderToWhatsApp(payload: OrderPayload) {
    try {
        OrderPayloadSchema.parse(payload);
    } catch (error) {
        logEvent('sendOrderToWhatsApp', 'error', 'Invalid order payload.', error);
        console.error("Invalid order payload:", error);
        return { success: false, error: "Invalid data provided." };
    }

    let message = `*¡Hola Trama Hogar!* 👋\nNuevo pedido de presupuesto:\n\n`;
    message += `🧵 *ITEM PRINCIPAL:*\n`;
    message += `↳ *${payload.mainItem.name}*\n`;
    message += `↳ Cantidad: ${payload.mainItem.quantity}\n`;
    message += `↳ Subtotal: $${payload.mainItem.subtotal}\n\n`;

    if (payload.extraItems.length > 0) {
        message += `✨ *ARTÍCULOS EXTRAS:*\n`;
        payload.extraItems.forEach(item => {
            message += `↳ ${item.name} (Cant: ${item.quantity}) - Total item: $${item.total}\n`;
        });
        message += `\n`;
    }

    message += `🚚 *MÉTODO DE ENTREGA:*\n`;
    if (payload.shipping.method === 'envio') {
        message += `↳ Envío (Costo: $${payload.shipping.cost})\n\n`;
    } else {
        message += `↳ Retiro en Local\n\n`;
    }

    message += `💰 *PRESUPUESTO TOTAL: $${payload.total}*`;
    
    return await sendChatMessageToWhatsApp(message, 'Pedido de Presupuesto');
}

export async function getAiSuggestions(product: Product): Promise<Extra[]> {
    logEvent('getAiSuggestions', 'info', 'Fetching AI suggestions for product.', { productName: product.name });
    try {
        const suggestions = await suggestComplementaryItems({ productName: product.name });
        logEvent('getAiSuggestions', 'success', 'Received AI suggestions.', suggestions);
        
        const allExtras = [...extrasCatalog, ...products.filter(p => p.id !== product.id).map(p => ({...p, id: `p-${p.id}`, suggested: false}))];

        const matchedExtras = suggestions.map(suggestion => {
            const found = allExtras.find(extra => extra.name.toLowerCase().includes(suggestion.name.toLowerCase()));
            if (found) {
                return { ...found, description: suggestion.description, suggested: true };
            }
            return null;
        }).filter((item): item is Extra => item !== null);

        // Remove duplicates and limit to 3
        const uniqueExtras = Array.from(new Map(matchedExtras.map(item => [item.id, item])).values());
        
        return uniqueExtras.slice(0, 3);
    } catch (error) {
        logEvent('getAiSuggestions', 'error', 'Error getting AI suggestions.', error);
        console.error("Error getting AI suggestions:", error);
        // Fallback to default suggested items
        return extrasCatalog.filter(e => e.suggested);
    }
}

export async function getAiChatResponse(query: string, fullHistory: string): Promise<string> {
    const payload = { query: `Full conversation history for context:\n${fullHistory}\n\nLatest user query: ${query}` };
    logEvent('getAiChatResponse', 'info', 'Getting AI chat response.', payload);
    try {
        const response = await aiChatAssistance(payload);
        logEvent('getAiChatResponse', 'success', 'Received AI chat response.', response);
        return response.response;
    } catch (error) {
        logEvent('getAiChatResponse', 'error', 'Error getting AI chat response.', error);
        console.error("Error getting AI chat response:", error);
        return "Lo siento, estoy teniendo problemas para conectarme. Por favor, intenta de nuevo más tarde.";
    }
}

export async function sendChatMessageToWhatsApp(text: string, senderName: string = 'Cliente') {
    if (!N8N_SEND_WEBHOOK_URL || !VENDOR_WHATSAPP_NUMBER) {
      const errorMsg = 'N8N webhook URL or Vendor WhatsApp number is not configured in .env';
      logEvent('sendChatMessageToWhatsApp', 'error', errorMsg);
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const payload = {
      phoneNumber: VENDOR_WHATSAPP_NUMBER,
      text: text,
      senderName: senderName,
    };
    logEvent('sendChatMessageToWhatsApp', 'info', 'Sending message via n8n', { url: N8N_SEND_WEBHOOK_URL, payload });

    try {
      const response = await fetch(N8N_SEND_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error from n8n webhook: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      logEvent('sendChatMessageToWhatsApp', 'success', 'Message sent via n8n successfully.', { result });
      return { success: true, messageId: result.messageId || `n8n_${Date.now()}` };

    } catch (error: any) {
      logEvent('sendChatMessageToWhatsApp', 'error', 'Failed to send message via n8n.', { error: error.message });
      console.error('Failed to send message via n8n:', error);
      return { success: false, error: error.message };
    }
}

export async function fetchNewWhatsAppMessages(): Promise<{ success: boolean, messages: ChatMessage[], error?: string }> {
    try {
        const messages = await getAndClearMessages();
        if (messages.length > 0) {
            logEvent('fetchNewWhatsAppMessages', 'success', `Fetched ${messages.length} new messages from store.`);
        }
        return { success: true, messages };
    } catch(error: any) {
        logEvent('fetchNewWhatsAppMessages', 'error', 'Failed to fetch messages from store.', { error: error.message });
        return { success: false, messages: [], error: error.message };
    }
}
