'use server';
/**
 * @fileOverview Flow to generate structured prompts for GPT-4 based on codebase analysis.
 *
 * - generateStructuredPrompts - A function that generates structured prompts.
 * - GenerateStructuredPromptsInput - The input type for the generateStructuredPrompts function.
 * - GenerateStructuredPromptsOutput - The return type for the generateStructuredPrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStructuredPromptsInputSchema = z.object({
  codebaseSummary: z
    .string()
    .describe("A summary of the codebase, including function definitions, comments, and routes."),
  fileStructure: z.string().describe('The file structure of the codebase.'),
  uiComponents: z
    .string()
    .optional()
    .describe('A description of the UI components, if UI-Only mode is enabled.'),
});
export type GenerateStructuredPromptsInput = z.infer<typeof GenerateStructuredPromptsInputSchema>;

const GenerateStructuredPromptsOutputSchema = z.object({
  readmePrompt: z.string().describe('Prompt for generating README.md file.'),
  apiDocsPrompt: z.string().describe('Prompt for generating API documentation.'),
  userManualPrompt: z.string().describe('Prompt for generating a user manual.'),
  faqPrompt: z.string().describe('Prompt for generating FAQs.'),
});
export type GenerateStructuredPromptsOutput = z.infer<typeof GenerateStructuredPromptsOutputSchema>;

export async function generateStructuredPrompts(
  input: GenerateStructuredPromptsInput
): Promise<GenerateStructuredPromptsOutput> {
  return generateStructuredPromptsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStructuredPromptsPrompt',
  input: {schema: GenerateStructuredPromptsInputSchema},
  output: {schema: GenerateStructuredPromptsOutputSchema},
  prompt: `You are an expert documentation generator. Based on the codebase summary, file structure, and UI components (if available), you will generate structured prompts for GPT-4 to generate documentation for the codebase.

Codebase Summary:
{{codebaseSummary}}

File Structure:
{{fileStructure}}

UI Components (if available):
{{uiComponents}}


Generate prompts for the following:
1.  README.md: A prompt to generate a comprehensive README file for the codebase.
2.  API Documentation: A prompt to generate API documentation, including endpoints, request/response formats, and authentication methods.
3.  User Manual: A prompt to generate a user manual for non-technical users, explaining how to use the application.
4.  FAQ: A prompt to generate frequently asked questions based on the code comments and functionality.

Return the prompts as a JSON object with the keys: readmePrompt, apiDocsPrompt, userManualPrompt, and faqPrompt.
Ensure that the prompts are detailed and specific enough for GPT-4 to generate high-quality documentation.

Ensure that the output is valid JSON.
`,
});

const generateStructuredPromptsFlow = ai.defineFlow(
  {
    name: 'generateStructuredPromptsFlow',
    inputSchema: GenerateStructuredPromptsInputSchema,
    outputSchema: GenerateStructuredPromptsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
