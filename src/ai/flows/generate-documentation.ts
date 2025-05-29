// use server'

/**
 * @fileOverview Generates comprehensive documentation for a codebase.
 *
 * - generateDocumentation - A function that handles the documentation generation process.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The return type for the generateDocumentation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDocumentationInputSchema = z.object({
  codebase: z
    .string()
    .describe('The codebase as a .zip file data URI or a GitHub repository URL.'),
});
export type GenerateDocumentationInput = z.infer<
  typeof GenerateDocumentationInputSchema
>;

const GenerateDocumentationOutputSchema = z.object({
  readme: z.string().describe('The generated README.md content.'),
  apiDocs: z.string().describe('The generated API documentation content.'),
  userManual: z.string().describe('The generated user manual content.'),
  faq: z.string().describe('The generated FAQ content.'),
});
export type GenerateDocumentationOutput = z.infer<
  typeof GenerateDocumentationOutputSchema
>;

export async function generateDocumentation(
  input: GenerateDocumentationInput
): Promise<GenerateDocumentationOutput> {
  return generateDocumentationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: GenerateDocumentationOutputSchema},
  prompt: `You are an AI documentation generator.  A user has provided a codebase, and you are tasked with generating comprehensive documentation for it.

  The codebase is provided as: {{{codebase}}}

  Your task is to generate the following:

  1.  A comprehensive README.md file.
  2.  API documentation.
  3.  A user manual.
  4.  FAQs based on the code comments.

  Ensure that the documentation is clear, concise, and easy to understand for both technical and non-technical users. The generated documentation should be in Markdown format.
  Follow the instructions closely and ensure all requested documentation sections are filled out.  The output should be complete and ready for use.
  `,
});

const generateDocumentationFlow = ai.defineFlow(
  {
    name: 'generateDocumentationFlow',
    inputSchema: GenerateDocumentationInputSchema,
    outputSchema: GenerateDocumentationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
