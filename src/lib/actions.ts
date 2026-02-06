'use server';

import { suggestComplementaryItems } from '@/ai/flows/suggest-complementary-items';
import { aiChatAssistance } from '@/ai/flows/ai-chat-assistance';
import type { Product, Extra, CartItem, EvolutionMessage } from '@/types';
import { products, extrasCatalog } from './data';
import { z } from 'zod';
import { logEvent } from './logger';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
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

const EvolutionMessageSchema = z.object({
  key: z.object({
    remoteJid: z.string(),
    fromMe: z.boolean(),
    id: z.string(),
  }),
  message: z.object({
    conversation: z.string().optional(),
    extendedTextMessage: z.object({
      text: z.string(),
    }).optional(),
  }).nullable(),
  messageTimestamp: z.number(),
});
const EvolutionMessagesResponseSchema = z.array(EvolutionMessageSchema);

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
    
    const destinationNumber = `${VENDOR_WHATSAPP_NUMBER}@c.us`;
    const endpoint = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    
    const requestBody = {
        number: destinationNumber,
        textMessage: {
            text: message,
        }
    };
    const requestHeaders = {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!,
    };

    const curlCommand = `curl -X POST "${endpoint}" -H "Content-Type: application/json" -H "apikey: ${EVOLUTION_API_KEY ? '********' : 'NOT_SET'}" -d '${JSON.stringify(requestBody)}'`;
    logEvent('sendOrderToWhatsApp', 'info', 'Preparing Evolution API request for order.', {
        endpoint,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY ? '******' : 'NOT SET',
        },
        body: requestBody,
        curl_equivalent: curlCommand
    });


    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody),
        });

        if (response.ok) {
            const responseData = await response.json().catch(() => ({}));
            logEvent('sendOrderToWhatsApp', 'success', 'Order sent successfully via Evolution API.', { status: response.status, response: responseData });
            return { success: true, message: "Order sent successfully." };
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Could not parse error response as JSON.' }));
            const errorMessage = errorData?.message || JSON.stringify(errorData) || 'Unknown API error';
            logEvent('sendOrderToWhatsApp', 'error', 'Evolution API Error sending order.', { status: response.status, error: errorData });
            console.error("Evolution API Error:", errorData);
            return { success: false, error: `API Error: ${errorMessage}` };
        }
    } catch (error: any) {
        logEvent('sendOrderToWhatsApp', 'error', 'Network/Fetch error while contacting Evolution API.', { name: error.name, message: error.message, cause: error.cause });
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

export async function sendChatMessageToWhatsApp(text: string): Promise<{ success: boolean; error?: string }> {
    if (!text) {
        logEvent('sendChatMessageToWhatsApp', 'error', 'Message text is empty.');
        return { success: false, error: 'Message text is empty.' };
    }
    
    const fullMessage = `Consulta desde el Chat Widget: "${text}"`;
    const destinationNumber = `${VENDOR_WHATSAPP_NUMBER}@c.us`;
    const endpoint = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    const requestBody = {
        number: destinationNumber,
        textMessage: {
            text: fullMessage,
        }
    };
    const requestHeaders = {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!,
    };

    const curlCommand = `curl -X POST "${endpoint}" -H "Content-Type: application/json" -H "apikey: ${EVOLUTION_API_KEY ? '********' : 'NOT_SET'}" -d '${JSON.stringify(requestBody)}'`;
    logEvent('sendChatMessageToWhatsApp', 'info', 'Preparing Evolution API request.', {
        endpoint,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY ? '******' : 'NOT SET',
        },
        body: requestBody,
        curl_equivalent: curlCommand
    });

     try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody),
        });
        
        if (response.ok) {
            const responseData = await response.json().catch(() => ({}));
            logEvent('sendChatMessageToWhatsApp', 'success', 'Chat message sent successfully.', { status: response.status, response: responseData });
            return { success: true };
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Could not parse error response as JSON.' }));
            const errorMessage = errorData?.response?.message || JSON.stringify(errorData) ||'Unknown API error';
            logEvent('sendChatMessageToWhatsApp', 'error', 'Failed to send chat message.', { status: response.status, error: errorData });
            return { success: false, error: `API Error: ${errorMessage}` };
        }
        
    } catch (error: any) {
        logEvent('sendChatMessageToWhatsApp', 'error', 'Network/Fetch error sending chat message.', { name: error.name, message: error.message, cause: error.cause });
        console.error("Error sending chat message:", error);
        return { success: false, error: `Network Error: ${error.message || 'Unknown error'}` };
    }
}

export async function fetchNewWhatsAppMessages(): Promise<{ success: boolean, messages: EvolutionMessage[], error?: string }> {
    const remoteJid = `${VENDOR_WHATSAPP_NUMBER}@s.whatsapp.net`;
    const endpoint = `${EVOLUTION_API_URL}/chat/findMessages/${EVOLUTION_INSTANCE}`;
    
    const params = new URLSearchParams({
        'where[key][remoteJid]': remoteJid,
        'limit': '10',
        'sort': 'desc'
    });

    const fullUrl = `${endpoint}?${params.toString()}`;

    const requestHeaders = {
        'apikey': EVOLUTION_API_KEY!,
    };
    
    logEvent('fetchNewWhatsAppMessages', 'info', 'Fetching new messages from WhatsApp.', {
        url: fullUrl,
    });

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: requestHeaders,
            cache: 'no-store',
        });

        if (response.ok) {
            const data = await response.json();
            const validation = EvolutionMessagesResponseSchema.safeParse(data);
            if (!validation.success) {
                const error = validation.error.format();
                logEvent('fetchNewWhatsAppMessages', 'error', 'Invalid message format from Evolution API.', { error });
                return { success: false, messages: [], error: 'Invalid message format from API.' };
            }
            logEvent('fetchNewWhatsAppMessages', 'success', `Fetched ${validation.data.length} messages.`);
            return { success: true, messages: validation.data };
        } else {
            const errorData = await response.json().catch(() => ({}));
            logEvent('fetchNewWhatsAppMessages', 'error', 'Failed to fetch messages.', { status: response.status, error: errorData });
            return { success: false, messages: [], error: `API Error: ${response.statusText}` };
        }
    } catch (error: any) {
        logEvent('fetchNewWhatsAppMessages', 'error', 'Network/Fetch error fetching messages.', { message: error.message });
        return { success: false, messages: [], error: `Network Error: ${error.message}` };
    }
}
