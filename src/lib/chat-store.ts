import { kv } from '@vercel/kv';
import type { ChatMessage } from '@/types';

// This is a unique key for this specific chat session.
// In a real multi-user app, you'd generate a unique ID per conversation.
const CONVERSATION_KEY = 'whatsapp_chat_messages';

/**
 * Adds a new message to the persistent conversation list in Vercel KV.
 * We use a list to store messages in order.
 */
export const addMessage = async (message: ChatMessage): Promise<void> => {
    await kv.lpush(CONVERSATION_KEY, message);
};

/**
 * Retrieves all messages from the conversation list and then clears the list.
 * This ensures messages are processed only once by the polling client.
 */
export const getAndClearMessages = async (): Promise<ChatMessage[]> => {
    // Atomically get all messages from the list.
    const messages = await kv.lrange<ChatMessage>(CONVERSATION_KEY, 0, -1);
    
    if (messages.length > 0) {
        // After fetching, clear the list.
        await kv.del(CONVERSATION_KEY);
    }
    
    // LPUSH adds to the head, so the list is in reverse chronological order.
    // We reverse it back to get the correct chronological order.
    return messages.reverse();
};
