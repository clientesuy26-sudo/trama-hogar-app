'use server';
/**
 * @fileOverview AI flow to suggest complementary items for a given product.
 *
 * - suggestComplementaryItems - A function that takes a product name and returns a list of suggested complementary items.
 * - SuggestComplementaryItemsInput - The input type for the suggestComplementaryItems function.
 * - SuggestComplementaryItemsOutput - The return type for the suggestComplementaryItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestComplementaryItemsInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
});
export type SuggestComplementaryItemsInput = z.infer<typeof SuggestComplementaryItemsInputSchema>;

const SuggestComplementaryItemsOutputSchema = z.array(
  z.object({
    name: z.string().describe('The name of the suggested complementary item.'),
    description: z.string().describe('A brief description of the item.'),
  })
);
export type SuggestComplementaryItemsOutput = z.infer<typeof SuggestComplementaryItemsOutputSchema>;

export async function suggestComplementaryItems(input: SuggestComplementaryItemsInput): Promise<SuggestComplementaryItemsOutput> {
  return suggestComplementaryItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestComplementaryItemsPrompt',
  input: {schema: SuggestComplementaryItemsInputSchema},
  output: {schema: SuggestComplementaryItemsOutputSchema},
  prompt: `You are an AI assistant specializing in suggesting complementary items for products on the Trama Hogar website.

  Given the name of a product, suggest three complementary items that would enhance the user's experience with the product.

  Product Name: {{{productName}}}

  Complementary Items:`,
});

const suggestComplementaryItemsFlow = ai.defineFlow({
    name: 'suggestComplementaryItemsFlow',
    inputSchema: SuggestComplementaryItemsInputSchema,
    outputSchema: SuggestComplementaryItemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
