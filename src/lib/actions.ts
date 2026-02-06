'use server';

import { suggestComplementaryItems } from '@/ai/flows/suggest-complementary-items';
import { aiChatAssistance } from '@/ai/flows/ai-chat-assistance';
import type { Product, Extra, CartItem } from '@/types';
import { products, extrasCatalog } from './data';
import { z } from 'zod';
import { logEvent } from './logger';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
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
    logEvent('sendOrderToWhatsApp', 'info', 'Attempting to send order to WhatsApp.', payload);
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

    logEvent('sendOrderToWhatsApp', 'info', 'Sending request to Evolution API.', {
        url: `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
        number: VENDOR_WHATSAPP_NUMBER,
    });

    try {
        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY!,
            },
            body: JSON.stringify({
                number: VENDOR_WHATSAPP_NUMBER,
                text: message,
            }),
        });

        if (response.ok) {
            logEvent('sendOrderToWhatsApp', 'success', 'Order sent successfully via Evolution API.');
            return { success: true, message: "Order sent successfully." };
        } else {
            const errorData = await response.json();
            logEvent('sendOrderToWhatsApp', 'error', 'Evolution API Error.', { status: response.status, errorData });
            console.error("Evolution API Error:", errorData);
            return { success: false, error: "Failed to send order via API." };
        }
    } catch (error) {
        logEvent('sendOrderToWhatsApp', 'error', 'Fetch error while contacting Evolution API.', error);
        console.error("Fetch Error:", error);
        return { success: false, error: "Network error or API is down." };
    }
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

export async function sendChatMessageToWhatsApp(text: string) {
    if (!text) {
        logEvent('sendChatMessageToWhatsApp', 'error', 'Message text is empty.');
        return { success: false, error: 'Message text is empty.' };
    }
    const fullMessage = `Consulta desde el Chat Widget: "${text}"`;
    logEvent('sendChatMessageToWhatsApp', 'info', 'Sending chat message to WhatsApp.', { text: fullMessage });

     try {
        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY!,
            },
            body: JSON.stringify({
                number: VENDOR_WHATSAPP_NUMBER,
                text: fullMessage,
            }),
        });
        
        if (response.ok) {
            logEvent('sendChatMessageToWhatsApp', 'success', 'Chat message sent successfully.');
        } else {
            const errorData = await response.json();
            logEvent('sendChatMessageToWhatsApp', 'error', 'Error sending chat message.', { status: response.status, errorData });
        }
        
        return { success: response.ok };
    } catch (error) {
        logEvent('sendChatMessageToWhatsApp', 'error', 'Fetch error sending chat message.', error);
        console.error("Error sending chat message:", error);
        return { success: false };
    }
}
