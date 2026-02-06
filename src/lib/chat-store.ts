import { kv } from '@vercel/kv';
import type { ChatMessage } from '@/types';

// This is a unique key for this specific chat session.
// In a real multi-user app, you'd generate a unique ID per conversation.
const CONVERSATION_KEY = 'whatsapp_chat_messages';

/**
 * Adds a new message to the persistent conversation list in Vercel KV.
 * We use a list (LPUSH) to store messages in order, making it behave like a queue.
 */
export const addMessage = async (message: ChatMessage): Promise<void> => {
    // LPUSH adds the message to the head of the list in Redis.
    await kv.lpush(CONVERSATION_KEY, message);
};

/**
 * Retrieves all messages from the conversation list and then clears the list.
 * This ensures messages are processed only once by the polling client.
 * This is an atomic operation to prevent race conditions.
 */
export const getAndClearMessages = async (): Promise<ChatMessage[]> => {
    // Start a transaction to ensure atomicity.
    const pipe = kv.pipeline();
    // 1. Get all messages from the list.
    pipe.lrange(CONVERSATION_KEY, 0, -1);
    // 2. Delete the list.
    pipe.del(CONVERSATION_KEY);
    
    // Execute the transaction.
    const [messages, _] = await pipe.exec<[ChatMessage[], number]>();
    
    if (messages && messages.length > 0) {
      // LPUSH adds to the head, so the list is in reverse chronological order.
      // We reverse it back to get the correct chronological order for the chat.
      return messages.reverse();
    }
    
    return [];
};
