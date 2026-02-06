import { NextRequest, NextResponse } from 'next/server';
import { addMessage } from '@/lib/chat-store';
import type { ChatMessage } from '@/types';
import { logEvent } from '@/lib/logger';

/**
 * Recibe mensajes desde n8n cuando llegan de WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logEvent('WebhookAPI', 'info', 'Webhook received from n8n.', body);

    // Basic validation for incoming message from n8n
    if (body.text && body.senderName && body.timestamp) {
      
      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        text: body.text,
        sender: 'user', // Messages from webhook are from the WhatsApp user
        senderName: body.senderName,
        timestamp: body.timestamp,
        status: 'delivered',
      };
      
      await addMessage(message);

      return NextResponse.json({ success: true, message: 'Message processed.' });
    }

    logEvent('WebhookAPI', 'error', 'Invalid payload from n8n.', body);
    return NextResponse.json(
      { error: 'Invalid payload. "text", "senderName", and "timestamp" are required.' }, 
      { status: 400 }
    );

  } catch (error: any) {
    logEvent('WebhookAPI', 'error', 'Error processing webhook.', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
