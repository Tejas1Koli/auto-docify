
'use server';
/**
 * @fileOverview Flow to export documentation to a GitBook space.
 *
 * - exportToGitBookFlow - A function that handles the GitBook export process.
 * - ExportToGitBookInput - The input type for the exportToGitBookFlow function.
 * - ExportToGitBookOutput - The return type for the exportToGitBookFlow function.
 */

import {ai} from '@/ai/genkit';
import type {GenerateDocumentationOutput} from '@/ai/flows/generate-documentation'; // Assuming this type is defined here
import {z} from 'genkit';

// Define the input schema, which is the generated documentation
// This const is internal and not exported.
const ExportToGitBookInputSchema = z.custom<GenerateDocumentationOutput>();
export type ExportToGitBookInput = z.infer<typeof ExportToGitBookInputSchema>;

// Define the output schema for the flow
// This const is internal and not exported.
const ExportToGitBookOutputSchema = z.object({
  success: z.boolean().describe('Whether the export was successful overall.'),
  message: z.string().describe('A summary message of the export process.'),
  details: z.array(z.object({
    section: z.string().describe('The documentation section exported.'),
    path: z.string().describe('The path in GitBook where the section was exported.'),
    status: z.string().describe('The status of exporting this section (e.g., "Success", "Failed").'),
    error: z.string().optional().describe('Error message if exporting this section failed.'),
  })).describe('Detailed status for each section exported.')
});
export type ExportToGitBookOutput = z.infer<typeof ExportToGitBookOutputSchema>;


// The actual flow function
const doExportToGitBookFlow = ai.defineFlow(
  {
    name: 'exportToGitBookFlow',
    inputSchema: ExportToGitBookInputSchema, // Uses the internal const
    outputSchema: ExportToGitBookOutputSchema, // Uses the internal const
  },
  async (docs: ExportToGitBookInput): Promise<ExportToGitBookOutput> => {
    const apiKey = process.env.GITBOOK_API_KEY;
    const spaceId = process.env.GITBOOK_SPACE_ID;

    if (!apiKey || !spaceId) {
      return {
        success: false,
        message: 'GitBook API Key or Space ID is not configured in environment variables.',
        details: [],
      };
    }

    const sectionsToExport: Array<{ key: keyof GenerateDocumentationOutput, title: string, path: string }> = [
      { key: 'readme', title: 'README', path: 'readme.md' },
      { key: 'apiDocs', title: 'API Docs', path: 'api-docs.md' },
      { key: 'userManual', title: 'User Manual', path: 'user-manual.md' },
      { key: 'faq', title: 'FAQ', path: 'faq.md' },
    ];

    const exportDetails: ExportToGitBookOutput['details'] = [];
    let allSuccessful = true;

    for (const section of sectionsToExport) {
      const markdownContent = docs[section.key];
      if (!markdownContent) {
        exportDetails.push({
          section: section.title,
          path: section.path,
          status: 'Skipped (No Content)',
        });
        continue;
      }

      const gitbookApiUrl = `https://api.gitbook.com/v1/spaces/${spaceId}/content/path/${encodeURIComponent(section.path)}`;

      try {
        const response = await fetch(gitbookApiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ markdown: markdownContent }),
        });

        if (response.ok) {
          // const responseData = await response.json(); // May not be needed if just checking status
          exportDetails.push({
            section: section.title,
            path: section.path,
            status: 'Success',
          });
        } else {
          allSuccessful = false;
          const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
          console.error(`GitBook API Error for ${section.path}:`, response.status, errorData);
          exportDetails.push({
            section: section.title,
            path: section.path,
            status: 'Failed',
            error: `API Error: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`,
          });
        }
      } catch (error: any) {
        allSuccessful = false;
        console.error(`Error exporting ${section.path} to GitBook:`, error);
        exportDetails.push({
          section: section.title,
          path: section.path,
          status: 'Failed',
          error: error.message || 'Unknown error during fetch operation.',
        });
      }
    }

    return {
      success: allSuccessful,
      message: allSuccessful ? 'Documentation successfully exported to GitBook.' : 'Some sections failed to export to GitBook. Check details.',
      details: exportDetails,
    };
  }
);

// Exported wrapper function
export async function exportToGitBookFlow(input: ExportToGitBookInput): Promise<ExportToGitBookOutput> {
  return doExportToGitBookFlow(input);
}
