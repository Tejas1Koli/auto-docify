
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
  prompt: `You are an AI expert documentation generator. Your task is to generate comprehensive, detailed, and well-structured documentation in Markdown format based on the user's input.
Use clear Markdown formatting: headings (H1, H2, H3), lists (bulleted and numbered), code blocks (with language specification where appropriate), and tables to enhance readability and organization.
Provide detailed explanations. Where applicable, include examples, edge cases, and best practices. The output should be suitable for direct use by developers and end-users.

{{#if uiOnlyMode}}
The user has indicated UI-Only mode. The input provided is a description, specification, or link related to a user interface:
Input: {{{codebase}}}

Your task is to generate the following, focusing on UI/UX aspects:

1.  **UI Overview (for the 'readme' field):**
    *   Provide a comprehensive overview of the application's user interface.
    *   Describe its primary purpose, target audience, and key design principles or goals.
    *   Detail the main layout, navigation structure (e.g., side navigation, top bar, tabs), and overall visual style.
    *   Mention any core philosophies behind the UI design (e.g., minimalism, data-density, ease of use).

2.  **Key Screens/Components (for the 'apiDocs' field):**
    *   Identify and describe major screens, views, or significant reusable UI components mentioned or implied in the input.
    *   For each screen/component:
        *   Explain its purpose and what users can accomplish there.
        *   List key UI elements present (e.g., forms, buttons, tables, charts, modals).
        *   Describe important interactions or states (e.g., hover effects, disabled states, loading indicators, form validation feedback).
    *   Use subheadings for each key screen or component.

3.  **User Flow Ideas (for the 'userManual' field):**
    *   Suggest potential user flows or task-oriented interactions based on the UI description.
    *   Describe each flow step-by-step from the user's perspective. For example:
        *   "User Registration Flow: 1. User clicks 'Sign Up'. 2. User fills in the registration form (email, password). 3. User clicks 'Submit'. 4. System sends a verification email."
        *   "Completing a Purchase: 1. User adds items to cart. 2. User proceeds to checkout. 3. User enters shipping and payment details. 4. User confirms order."
    *   Aim for clarity and completeness in describing how a user would navigate through the UI to achieve a goal.

4.  **UI-Focused FAQ (for the 'faq' field):**
    *   Generate questions and answers a user might have about navigating, understanding, or using the described UI.
    *   Examples: "How do I change my profile picture?", "Where can I find my order history?", "What do the different colored icons mean?".
    *   Provide clear, concise answers.

{{else}}
The user has provided a codebase (or description of one) for documentation.
Codebase Information: {{{codebase}}}

Your task is to generate the following standard code documentation:

1.  **README.md (for the 'readme' field):**
    *   **Overview**: Briefly describe the project, its purpose, and what problem it solves.
    *   **Features**: List key features and functionalities.
    *   **Getting Started**:
        *   **Prerequisites**: List software, tools, or accounts needed.
        *   **Installation**: Provide step-by-step installation instructions (e.g., cloning, dependency installation).
        *   **Configuration**: Explain any necessary configuration steps (e.g., environment variables, config files).
        *   **Running the Application/Service**: How to start and run the project.
    *   **Usage/Examples**: Show how to use the project with code examples or command-line invocations.
    *   **(Optional) Project Structure**: Briefly describe important directories and files.
    *   **(Optional) Contributing**: Guidelines for contributing.
    *   **License**: Mention the license.

2.  **API Documentation (for the 'apiDocs' field):**
    *   If it's a web API, detail endpoints: HTTP method, URL, request parameters (path, query, body with types and descriptions), expected request/response formats (JSON structure with field descriptions), and authentication methods.
    *   For code libraries/modules, detail public functions, classes, and methods:
        *   **Functions/Methods**: Name, purpose, parameters (name, type, description, optional/required), return value (type, description), and potential errors or exceptions. Include usage examples.
        *   **Classes**: Purpose, constructor, properties (name, type, description), and methods (as above).
    *   Use code blocks for examples and type signatures.

3.  **User Manual (for the 'userManual' field):**
    *   Explain how to use the software from an end-user's perspective.
    *   Provide step-by-step instructions for common tasks and features.
    *   Include screenshots or diagrams descriptions if the input implies visual elements.
    *   Cover topics like initial setup (if different from developer setup), basic operations, advanced features, and troubleshooting common user issues.

4.  **FAQ (for the 'faq' field):**
    *   Generate frequently asked questions based on the code, comments, and potential user queries.
    *   Cover installation issues, common errors, how to achieve specific outcomes, and understanding specific functionalities.
    *   Provide clear, actionable answers.

{{/if}}

Ensure all requested documentation sections are filled out comprehensively. The output should be complete, accurate, and ready for use.
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

