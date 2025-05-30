
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
    *   Ensure this section is thorough and provides a complete picture of the UI's intent and structure.

2.  **Key Screens/Components (for the 'apiDocs' field):**
    *   Identify and describe major screens, views, or significant reusable UI components mentioned or implied in the input.
    *   For each screen/component:
        *   Explain its purpose and what users can accomplish there.
        *   List key UI elements present (e.g., forms, buttons, tables, charts, modals).
        *   Describe important interactions or states (e.g., hover effects, disabled states, loading indicators, form validation feedback).
    *   Use subheadings for each key screen or component. Be detailed and cover all significant aspects.

3.  **User Flow Ideas (for the 'userManual' field):**
    *   Suggest potential user flows or task-oriented interactions based on the UI description.
    *   Describe each flow step-by-step from the user's perspective. For example:
        *   "User Registration Flow: 1. User clicks 'Sign Up'. 2. User fills in the registration form (email, password). 3. User clicks 'Submit'. 4. System sends a verification email."
        *   "Completing a Purchase: 1. User adds items to cart. 2. User proceeds to checkout. 3. User enters shipping and payment details. 4. User confirms order."
    *   Aim for clarity and completeness in describing how a user would navigate through the UI to achieve a goal. Provide several distinct and detailed flows.

4.  **UI-Focused FAQ (for the 'faq' field):**
    *   Generate a comprehensive list of questions and answers a user might have about navigating, understanding, or using the described UI.
    *   Examples: "How do I change my profile picture?", "Where can I find my order history?", "What do the different colored icons mean?".
    *   Provide clear, concise, and helpful answers for at least 5-10 relevant questions.

{{else}}
The user has provided a codebase (or description of one) for documentation.
Codebase Information: {{{codebase}}}

Your task is to generate the following standard code documentation:

1.  **README.md (for the 'readme' field):**
    *   **Overview**: Fully describe the project, its purpose, and what problem it solves in detail.
    *   **Features**: List all key features and functionalities with brief explanations for each.
    *   **Getting Started**:
        *   **Prerequisites**: List all software, tools, or accounts needed. Be specific with versions if applicable.
        *   **Installation**: Provide complete, step-by-step installation instructions (e.g., cloning, dependency installation). Include actual commands.
        *   **Configuration**: Explain all necessary configuration steps (e.g., environment variables, config files with examples).
        *   **Running the Application/Service**: Detailed instructions on how to start and run the project, including example commands and expected output.
    *   **Usage/Examples**: Show how to use the project with several clear code examples or command-line invocations. Cover common use cases.
    *   **(Optional but Recommended) Project Structure**: Briefly describe important directories and files, explaining their roles.
    *   **(Optional) Contributing**: Guidelines for contributing, if applicable.
    *   **License**: Mention the license.

2.  **API Documentation (for the 'apiDocs' field):**
    *   If it's a web API, detail all endpoints: HTTP method, full URL, request parameters (path, query, body with types, descriptions, and examples), expected request/response formats (JSON structure with field descriptions and example values), and authentication methods.
    *   For code libraries/modules, detail all public functions, classes, and methods:
        *   **Functions/Methods**: Name, purpose, all parameters (name, type, description, optional/required, default values), return value (type, description, example), and potential errors or exceptions. Include detailed usage examples.
        *   **Classes**: Purpose, constructor (with parameters), properties (name, type, description), and methods (as above for functions).
    *   Use code blocks extensively for examples, type signatures, and request/response bodies.

3.  **User Manual (for the 'userManual' field):**
    *   Explain thoroughly how to use the software from an end-user's perspective.
    *   Provide detailed step-by-step instructions for common tasks and all significant features.
    *   Include descriptions that would map to screenshots or diagrams if the input implies visual elements.
    *   Cover topics like initial setup (if different from developer setup), basic operations, advanced features, and troubleshooting common user issues. Be comprehensive.

4.  **FAQ (for the 'faq' field):**
    *   Generate a comprehensive list of frequently asked questions based on the code, comments, and potential user queries.
    *   Cover installation issues, common errors, how to achieve specific outcomes, understanding specific functionalities, and limitations.
    *   Provide clear, actionable, and detailed answers. Aim for at least 5-10 substantial questions.

{{/if}}

Ensure all requested documentation sections are filled out comprehensively and without any truncation. The output should be complete, detailed, accurate, and ready for direct use. If the input is substantial, prioritize completeness and depth for each section over extreme brevity.
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

