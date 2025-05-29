'use server';

/**
 * @fileOverview Regenerates a specific section of the documentation with a specified tone.
 *
 * - regenerateDocumentationSection - A function that regenerates a specific section of documentation.
 * - RegenerateDocumentationSectionInput - The input type for the regenerateDocumentationSection function.
 * - RegenerateDocumentationSectionOutput - The return type for the regenerateDocumentationSection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RegenerateDocumentationSectionInputSchema = z.object({
  codebase: z.string().describe('The codebase to document.'),
  sectionName: z.string().describe('The name of the documentation section to regenerate (e.g., API Docs).'),
  tone: z.string().describe('The desired tone for the regenerated documentation (e.g., developer-friendly, business-friendly).'),
});
export type RegenerateDocumentationSectionInput = z.infer<typeof RegenerateDocumentationSectionInputSchema>;

const RegenerateDocumentationSectionOutputSchema = z.object({
  regeneratedContent: z.string().describe('The regenerated documentation section content in Markdown format.'),
});
export type RegenerateDocumentationSectionOutput = z.infer<typeof RegenerateDocumentationSectionOutputSchema>;

export async function regenerateDocumentationSection(
  input: RegenerateDocumentationSectionInput
): Promise<RegenerateDocumentationSectionOutput> {
  return regenerateDocumentationSectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'regenerateDocumentationSectionPrompt',
  input: {schema: RegenerateDocumentationSectionInputSchema},
  output: {schema: RegenerateDocumentationSectionOutputSchema},
  prompt: `You are an AI documentation expert.  Based on the provided codebase, regenerate the "{{sectionName}}" section of the documentation with a "{{tone}}" tone.\n\nCodebase:\n{{{codebase}}}\n\nRegenerated Documentation Section ({{sectionName}}, {{tone}}):`,
});

const regenerateDocumentationSectionFlow = ai.defineFlow(
  {
    name: 'regenerateDocumentationSectionFlow',
    inputSchema: RegenerateDocumentationSectionInputSchema,
    outputSchema: RegenerateDocumentationSectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
