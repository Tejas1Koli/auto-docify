'use server';
/**
 * @fileOverview Generates documentation, FAQs, and tutorials using GPT-4 based on structured prompts.
 *
 * - gpt4DocumentationGeneration - A function that generates documentation using GPT-4.
 * - Gpt4DocumentationGenerationInput - The input type for the gpt4DocumentationGeneration function.
 * - Gpt4DocumentationGenerationOutput - The return type for the gpt4DocumentationGeneration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const Gpt4DocumentationGenerationInputSchema = z.object({
  codebaseSummary: z
    .string()
    .describe("A summary of the codebase, including function definitions, comments, routes, and file structure."),
  promptInstructions: z.string().describe("Instructions for generating the documentation, FAQs, and tutorials."),
});

export type Gpt4DocumentationGenerationInput = z.infer<
  typeof Gpt4DocumentationGenerationInputSchema
>;

const Gpt4DocumentationGenerationOutputSchema = z.object({
  documentation: z.string().describe("The generated documentation in Markdown format."),
  faqs: z.string().describe("The generated FAQs in Markdown format."),
  tutorials: z.string().describe("The generated tutorials in Markdown format."),
});

export type Gpt4DocumentationGenerationOutput = z.infer<
  typeof Gpt4DocumentationGenerationOutputSchema
>;

export async function gpt4DocumentationGeneration(
  input: Gpt4DocumentationGenerationInput
): Promise<Gpt4DocumentationGenerationOutput> {
  return gpt4DocumentationGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gpt4DocumentationGenerationPrompt',
  input: {schema: Gpt4DocumentationGenerationInputSchema},
  output: {schema: Gpt4DocumentationGenerationOutputSchema},
  prompt: `You are an AI documentation generator. You will generate documentation, FAQs, and tutorials based on the provided codebase summary and instructions.

Codebase Summary:
{{codebaseSummary}}

Instructions:
{{promptInstructions}}

Output the documentation, FAQs, and tutorials in Markdown format.

Documentation:

FAQs:

Tutorials:`,
});

const gpt4DocumentationGenerationFlow = ai.defineFlow(
  {
    name: 'gpt4DocumentationGenerationFlow',
    inputSchema: Gpt4DocumentationGenerationInputSchema,
    outputSchema: Gpt4DocumentationGenerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
