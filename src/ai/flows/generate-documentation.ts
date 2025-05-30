'use server';

/**
 * @fileOverview Generates comprehensive documentation for a codebase or UI description.
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
    .describe('The codebase as a .zip file data URI, a GitHub repository URL, or a textual description/link for the UI if uiOnlyMode is true.'),
  uiOnlyMode: z.boolean().optional().default(false).describe('Indicates if the generation should focus on UI aspects. If true, the "codebase" input is treated as a UI description or Figma link.'),
});
export type GenerateDocumentationInput = z.infer<
  typeof GenerateDocumentationInputSchema
>;

// Output schema remains the same, but the content will differ based on uiOnlyMode
const GenerateDocumentationOutputSchema = z.object({
  readme: z.string().describe('The main generated document (e.g., README.md for code, UI Overview for UI mode).'),
  apiDocs: z.string().describe('Supporting technical details (e.g., API Docs for code, Key Screens/Components for UI mode).'),
  userManual: z.string().describe('Guidance for users (e.g., User Manual for code, User Flow Ideas for UI mode).'),
  faq: z.string().describe('Frequently Asked Questions relevant to the input.'),
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
  prompt: `You are an AI documentation generator. Your task is to generate comprehensive documentation based on the user's input.

{{#if uiOnlyMode}}
The user has indicated UI-Only mode. The input provided is a description or link related to a user interface:
Input: {{{codebase}}}

Your task is to generate the following, focusing on UI aspects:
1.  UI Overview (for the 'readme' field): A general description of the application's UI, its purpose, and main layout.
2.  Key Screens/Components (for the 'apiDocs' field): Identify and describe major screens, components, or UI elements mentioned or implied.
3.  User Flow Ideas (for the 'userManual' field): Suggest potential user flows or interactions based on the UI description.
4.  UI-Focused FAQ (for the 'faq' field): Generate questions and answers a user might have about navigating or using the described UI.
Make the content suitable for these specific section titles.
{{else}}
The user has provided a codebase for documentation.
Codebase: {{{codebase}}}

Your task is to generate the following standard code documentation:
1.  README.md (for the 'readme' field): A comprehensive README file for the codebase.
2.  API Documentation (for the 'apiDocs' field): Detail functions, classes, endpoints, request/response formats if applicable.
3.  User Manual (for the 'userManual' field): Explain how to install, configure, and use the software.
4.  FAQ (for the 'faq' field): Generate frequently asked questions based on the code, comments, and functionality.
{{/if}}

Ensure that the documentation is clear, concise, and easy to understand. The generated documentation should be in Markdown format.
Follow the instructions closely and ensure all requested documentation sections are filled out. The output should be complete and ready for use.
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
