'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, X, SendHorizonal, LoaderCircle, Check, Circle, CheckCheck, Clock, AlertTriangle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { sendChatMessageToWhatsApp, fetchNewWhatsAppMessages } from '@/lib/actions';
import { logEvent } from '@/lib/logger';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const CustomerInfoSchema = z.object({
  name: z.string().min(2, { message: 'El nombre es requerido.' }),
  whatsapp: z.string().regex(/^(?:\+?598)?(09\d{7}|\d{8})$/, { message: 'Ingresa un WhatsApp válido de Uruguay (ej: 099123456).' }),
  barrio: z.string().min(3, { message: 'El barrio es requerido.' }),
});
type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

type ChatWidgetProps = {
    isOpen: boolean;
    onToggle: (open?: boolean) => void;
    initialMessage: string;
    clearInitialMessage: () => void;
};

export function ChatWidget({ isOpen, onToggle, initialMessage, clearInitialMessage }: ChatWidgetProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const isOpenRef = useRef(isOpen);

    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isCollectingInfo, setIsCollectingInfo] = useState(false);

    const form = useForm<CustomerInfo>({
        resolver: zodResolver(CustomerInfoSchema),
        defaultValues: { name: '', whatsapp: '', barrio: '' },
        mode: 'onChange',
    });

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

    const handleNewMessages = useCallback((fetchedMessages: ChatMessage[]) => {
        if (fetchedMessages.length > 0) {
            if (!isOpenRef.current) {
                setHasNewMessage(true);
            }
            setMessages(prev => [...prev, ...fetchedMessages]);
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
        poll(); 
        return () => clearInterval(intervalId);
    }, [handleNewMessages]);

    useEffect(() => {
        if (isOpen) {
            setHasNewMessage(false);
            
            let savedInfo: CustomerInfo | null = null;
            try {
                const savedInfoRaw = localStorage.getItem('tramaHogarCustomerInfo');
                if (savedInfoRaw) {
                    savedInfo = CustomerInfoSchema.parse(JSON.parse(savedInfoRaw));
                }
            } catch (e) {
                localStorage.removeItem('tramaHogarCustomerInfo');
            }

            if (savedInfo) {
                if(!customerInfo) setCustomerInfo(savedInfo);
                setIsCollectingInfo(false);
            } else {
                setIsCollectingInfo(true);
            }

            if (messages.length === 0 && !isCollectingInfo) {
                 const welcomeMessage: ChatMessage = {
                    id: 'welcome',
                    text: '¡Hola! Soy Maya de Trama Hogar. ¿En qué puedo ayudarte con tu presupuesto hoy? 👋',
                    sender: 'user',
                    senderName: 'Maya',
                    timestamp: Date.now(),
                    status: 'delivered'
                };
                setMessages([welcomeMessage]);
            }

            if (initialMessage) {
                const tempId = `temp_${Date.now()}`;
                const orderMessage: ChatMessage = {
                    id: tempId,
                    text: initialMessage,
                    sender: 'agent',
                    senderName: 'Tú',
                    timestamp: Date.now(),
                    status: 'sending'
                };
                setMessages(prev => [...prev, orderMessage]);
                clearInitialMessage();
                
                sendChatMessageToWhatsApp(initialMessage, 'Pedido').then(result => {
                    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: result.success ? 'sent' : 'error', id: result.success ? result.messageId! : tempId } : m));
                });
            }
            scrollToBottom();
        }
    }, [isOpen, initialMessage, clearInitialMessage]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);


    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const text = inputValue.trim();
        if (!text || isSending || !customerInfo) return;

        const tempId = `temp_${Date.now()}`;
        const userMessage: ChatMessage = {
            id: tempId,
            text,
            sender: 'agent',
            senderName: 'Tú',
            timestamp: Date.now(),
            status: 'sending'
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsSending(true);

        logEvent('ChatWidget', 'info', 'Sending message via n8n...', { text });
        const result = await sendChatMessageToWhatsApp(text, customerInfo.name, customerInfo);
        
        if (result.success) {
            logEvent('ChatWidget', 'success', 'Message sent to n8n successfully.');
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent', id: result.messageId! } : m));
        } else {
            logEvent('ChatWidget', 'error', 'Failed to send message to n8n.', { error: result.error });
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        }
        setIsSending(false);
    };

    const handleInfoSubmit = (data: CustomerInfo) => {
        logEvent('ChatWidget', 'info', 'Customer info collected.', data);
        localStorage.setItem('tramaHogarCustomerInfo', JSON.stringify(data));
        setCustomerInfo(data);
        setIsCollectingInfo(false);
        setMessages([
            {
                id: 'welcome-info',
                text: `¡Genial! Gracias, ${data.name}. Ahora puedes escribir tu consulta.`,
                sender: 'user',
                senderName: 'Maya',
                timestamp: Date.now(),
                status: 'delivered'
            }
        ]);
    };

    const getStatusIcon = (status?: ChatMessage['status']) => {
        switch (status) {
            case 'sending': return <Clock className="h-3 w-3 text-white/70" />;
            case 'sent': return <Check className="h-3 w-3 text-white/70" />;
            case 'delivered': return <CheckCheck className="h-3 w-3 text-white/70" />;
            case 'error': return <AlertTriangle className="h-3 w-3 text-red-400" />;
            default: return null;
        }
    }

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
                        <div key={msg.id} className={cn("flex", msg.sender === 'agent' ? 'justify-end' : 'justify-start')}>
                            <div className={cn("max-w-[85%] py-2 px-3.5 text-sm rounded-2xl shadow-sm", {
                                "bg-primary text-primary-foreground rounded-br-md": msg.sender === 'agent',
                                "bg-card text-card-foreground border rounded-bl-md": msg.sender === 'user'
                            })}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <div className={cn("flex items-center gap-1 mt-1", msg.sender === 'agent' ? 'justify-end' : 'justify-start')}>
                                    <span className={cn("text-[10px]", msg.sender === 'agent' ? 'text-white/60' : 'text-muted-foreground')}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.sender === 'agent' && getStatusIcon(msg.status)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isSending && (
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
                {isCollectingInfo ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleInfoSubmit)} className="space-y-3">
                            <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Antes de empezar, necesitamos unos datos</p>
                             <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Nombre</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Nombre y Apellido" {...field} className="bg-secondary/50 h-9"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="whatsapp"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">WhatsApp</FormLabel>
                                    <FormControl>
                                    <Input type="tel" placeholder="N° de WhatsApp (ej: 099123456)" {...field} className="bg-secondary/50 h-9"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barrio"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Barrio</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Barrio" {...field} className="bg-secondary/50 h-9"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={!form.formState.isValid}>
                                <User className="mr-2 h-4 w-4"/>
                                Guardar y Continuar
                            </Button>
                        </form>
                    </Form>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-2 bg-secondary/50 rounded-full px-2 py-1 items-center">
                        <Input
                            id="chat-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                            autoComplete="off"
                            disabled={isSending}
                        />
                        <Button type="submit" size="icon" className="rounded-full w-9 h-9" disabled={!inputValue || isSending}>
                            {isSending ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <SendHorizonal className="h-4 w-4" />}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
