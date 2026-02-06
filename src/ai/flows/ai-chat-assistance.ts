'use server';

/**
 * @fileOverview Provides AI assistance within the chat widget to answer customer queries.
 *
 * - aiChatAssistance - An async function that processes customer queries and returns AI-generated responses.
 * - AiChatAssistanceInput - The input type for the aiChatAssistance function.
 * - AiChatAssistanceOutput - The return type for the aiChatAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiChatAssistanceInputSchema = z.object({
  query: z.string().describe('The customer query about product details or customization options.'),
});
export type AiChatAssistanceInput = z.infer<typeof AiChatAssistanceInputSchema>;

const AiChatAssistanceOutputSchema = z.object({
  response: z.string().describe('The AI-generated response to the customer query.'),
});
export type AiChatAssistanceOutput = z.infer<typeof AiChatAssistanceOutputSchema>;

export async function aiChatAssistance(input: AiChatAssistanceInput): Promise<AiChatAssistanceOutput> {
  return aiChatAssistanceFlow(input);
}

const aiChatAssistancePrompt = ai.definePrompt({
  name: 'aiChatAssistancePrompt',
  input: {schema: AiChatAssistanceInputSchema},
  output: {schema: AiChatAssistanceOutputSchema},
  prompt: `You are Maya, a helpful AI assistant for Trama Hogar, an online store selling artisanal textile products for the home.

  You should answer questions about product details, customization options, and help customers find what they are looking for.

  Be informative and friendly.

  Customer Query: {{{query}}}

  Response:`,
});

const aiChatAssistanceFlow = ai.defineFlow(
  {
    name: 'aiChatAssistanceFlow',
    inputSchema: AiChatAssistanceInputSchema,
    outputSchema: AiChatAssistanceOutputSchema,
  },
  async input => {
    const {output} = await aiChatAssistancePrompt(input);
    return output!;
  }
);
