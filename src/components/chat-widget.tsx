'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, X, SendHorizonal, LoaderCircle, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, EvolutionMessage } from '@/types';
import { getAiChatResponse, sendChatMessageToWhatsApp, fetchNewWhatsAppMessages } from '@/lib/actions';
import { logEvent } from '@/lib/logger';

type ChatWidgetProps = {
    isOpen: boolean;
    onToggle: (open?: boolean) => void;
    initialMessage: string;
    clearInitialMessage: () => void;
};

export function ChatWidget({ isOpen, onToggle, initialMessage, clearInitialMessage }: ChatWidgetProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const processedMessageIds = useRef(new Set<string>());
    const isOpenRef = useRef(isOpen);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) {
                    viewport.scrollTop = viewport.scrollHeight;
                }
            }
        }, 100);
    }, []);

    const handleNewMessages = useCallback((fetchedMessages: EvolutionMessage[]) => {
        const newChatMessages: ChatMessage[] = [];
        
        fetchedMessages.slice().reverse().forEach(msg => {
            if (!msg.key.fromMe && msg.message && !processedMessageIds.current.has(msg.key.id)) {
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if (text) {
                    newChatMessages.push({
                        id: msg.key.id,
                        text: text,
                        type: 'received',
                        timestamp: msg.messageTimestamp * 1000
                    });
                    processedMessageIds.current.add(msg.key.id);
                }
            }
        });

        if (newChatMessages.length > 0) {
            if (!isOpenRef.current) {
                setHasNewMessage(true);
            }
            setMessages(prev => [...prev, ...newChatMessages]);
        }
    }, []);
    
    useEffect(() => {
        const poll = async () => {
            const result = await fetchNewWhatsAppMessages();
            if (result.success && result.messages.length > 0) {
                handleNewMessages(result.messages);
            }
        };

        const intervalId = setInterval(poll, 5000);
        poll(); // Initial poll

        return () => clearInterval(intervalId);
    }, [handleNewMessages]);

    useEffect(() => {
        if (isOpen) {
            setHasNewMessage(false);
            const welcomeMessage: ChatMessage = {
                id: 'welcome',
                text: '¡Hola! Soy Maya de Trama Hogar. ¿En qué puedo ayudarte con tu presupuesto hoy? 👋',
                type: 'received',
                timestamp: Date.now()
            };
            if(messages.length === 0) {
              setMessages([welcomeMessage]);
              processedMessageIds.current.add(welcomeMessage.id);
            }

            if (initialMessage) {
                const orderMessage: ChatMessage = {
                    id: `sent-${Date.now()}`,
                    text: initialMessage,
                    type: 'sent',
                    timestamp: Date.now()
                };
                processedMessageIds.current.add(orderMessage.id);
                setMessages(prev => [...prev, orderMessage]);
                handleAiResponse(initialMessage, [welcomeMessage, orderMessage]);
                clearInitialMessage();
            }
            scrollToBottom();
        }
    }, [isOpen, initialMessage, clearInitialMessage, handleNewMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleAiResponse = async (query: string, currentHistory: ChatMessage[]) => {
        setIsTyping(true);
        const historyText = currentHistory.map(m => `${m.type === 'sent' ? 'User' : 'Maya'}: ${m.text}`).join('\n');
        const aiResponse = await getAiChatResponse(query, historyText);
        
        const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            text: aiResponse,
            type: 'received',
            timestamp: Date.now()
        };
        processedMessageIds.current.add(aiMessage.id);
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const text = inputValue.trim();
        if (!text) return;

        const userMessage: ChatMessage = {
            id: `sent-${Date.now()}`,
            text,
            type: 'sent',
            timestamp: Date.now()
        };
        processedMessageIds.current.add(userMessage.id);

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');

        logEvent('ChatWidget', 'info', 'Sending message to WhatsApp...', { text });
        const result = await sendChatMessageToWhatsApp(text);
        if (result.success) {
            logEvent('ChatWidget', 'success', 'Message sent to WhatsApp successfully.');
        } else {
            logEvent('ChatWidget', 'error', 'Failed to send message to WhatsApp.', { error: result.error });
        }

        await handleAiResponse(text, newMessages);
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => onToggle(true)}
                className="fixed bottom-6 right-6 z-50 h-14 rounded-full px-5 shadow-2xl transition-all hover:scale-105 group"
            >
                <Bot className="mr-2 h-6 w-6"/>
                <span className="font-bold tracking-wide">Habla con Maya</span>
                 {hasNewMessage && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </Button>
        );
    }
    
    return (
        <div className="fixed bottom-6 right-6 sm:bottom-24 sm:right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[70vh] sm:h-[550px] bg-card rounded-3xl shadow-2xl flex flex-col overflow-hidden border z-50 animate-in slide-in-from-bottom duration-300">
            <div className="bg-primary p-4 flex items-center gap-3 shadow-md text-primary-foreground">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot />
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-sm uppercase tracking-wider">Maya - Trama Hogar</h3>
                    <p className="text-white/70 text-[10px] uppercase font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> En línea
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onToggle(false)} className="text-white/80 hover:text-white transition-colors">
                    <X />
                </Button>
            </div>
            <ScrollArea className="flex-1 bg-secondary/30" ref={scrollAreaRef}>
                <div className="p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex", msg.type === 'sent' ? 'justify-end' : 'justify-start')}>
                            <div className={cn("max-w-[85%] py-2 px-3.5 text-sm rounded-2xl shadow-sm", {
                                "bg-primary text-primary-foreground rounded-br-md": msg.type === 'sent',
                                "bg-card text-card-foreground border rounded-bl-md": msg.type === 'received'
                            })}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                         <div className="flex justify-start">
                            <div className="max-w-[85%] py-2 px-3.5 text-sm rounded-2xl shadow-sm bg-card text-card-foreground border rounded-bl-md flex items-center gap-2">
                                <Circle className="w-1.5 h-1.5 animate-pulse delay-0" />
                                <Circle className="w-1.5 h-1.5 animate-pulse delay-200" />
                                <Circle className="w-1.5 h-1.5 animate-pulse delay-400" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-4 border-t bg-card">
                <form onSubmit={handleSendMessage} className="flex gap-2 bg-secondary/50 rounded-full px-2 py-1 items-center">
                    <Input
                        id="chat-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" className="rounded-full w-9 h-9" disabled={!inputValue || isTyping}>
                        {isTyping ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <SendHorizonal className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
