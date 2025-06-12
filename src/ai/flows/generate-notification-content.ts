// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview A flow that generates engaging notification content based on the target page's content.
 *
 * - generateNotificationContent - A function that handles the generation of notification content.
 * - GenerateNotificationContentInput - The input type for the generateNotificationContent function.
 * - GenerateNotificationContentOutput - The return type for the generateNotificationContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNotificationContentInputSchema = z.object({
  pageContent: z
    .string()
    .describe('The content of the target page to generate notification content for.'),
});
export type GenerateNotificationContentInput = z.infer<
  typeof GenerateNotificationContentInputSchema
>;

const GenerateNotificationContentOutputSchema = z.object({
  title: z.string().describe('The title of the notification.'),
  body: z.string().describe('The body of the notification.'),
  imageUrl: z.string().optional().describe('Optional image URL for the notification.'),
});
export type GenerateNotificationContentOutput = z.infer<
  typeof GenerateNotificationContentOutputSchema
>;

export async function generateNotificationContent(
  input: GenerateNotificationContentInput
): Promise<GenerateNotificationContentOutput> {
  return generateNotificationContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNotificationContentPrompt',
  input: {schema: GenerateNotificationContentInputSchema},
  output: {schema: GenerateNotificationContentOutputSchema},
  prompt: `You are an expert marketing assistant specializing in creating push notification content.

  You will use the content of the page to generate engaging notification content to bring the user back to the site.
  The notification should be concise and engaging.

  Page Content: {{{pageContent}}}
  `,
});

const generateNotificationContentFlow = ai.defineFlow(
  {
    name: 'generateNotificationContentFlow',
    inputSchema: GenerateNotificationContentInputSchema,
    outputSchema: GenerateNotificationContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
