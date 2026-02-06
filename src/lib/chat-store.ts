import type { ChatMessage } from '@/types';

// Simple in-memory store for chat messages.
// NOTE: This is not suitable for production with multiple server instances or restarts.
const messageStore: ChatMessage[] = [];

export const addMessage = (message: ChatMessage) => {
    messageStore.push(message);
};

export const getAndClearMessages = (): ChatMessage[] => {
    if (messageStore.length === 0) {
        return [];
    }
    const messages = [...messageStore];
    messageStore.length = 0; // Clear the array
    return messages;
};
