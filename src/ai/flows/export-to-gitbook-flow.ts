
'use server';
/**
 * @fileOverview Flow to generate a .zip file for GitBook export.
 *
 * - exportToGitBookFlow - A function that handles the GitBook .zip generation.
 * - ExportToGitBookInput - The input type for the exportToGitBookFlow function.
 * - ExportToGitBookOutput - The return type for the exportToGitBookFlow function.
 */

import {ai} from '@/ai/genkit';
import type {GenerateDocumentationOutput} from '@/ai/flows/generate-documentation';
import {z} from 'genkit';
import JSZip from 'jszip';

// Input schema is the generated documentation object
const ExportToGitBookInputSchema = z.custom<GenerateDocumentationOutput>();
export type ExportToGitBookInput = z.infer<typeof ExportToGitBookInputSchema>;

// Output schema for the flow: details of the generated zip file
const ExportToGitBookOutputSchema = z.object({
  fileName: z.string().describe('The name of the generated .zip file.'),
  mimeType: z.string().describe('The MIME type of the file (application/zip).'),
  content: z.string().describe('The base64 encoded content of the .zip file.'),
  message: z.string().describe('A message about the export process.')
});
export type ExportToGitBookOutput = z.infer<typeof ExportToGitBookOutputSchema>;

// The actual flow function
const doExportToGitBookFlow = ai.defineFlow(
  {
    name: 'exportToGitBookFlow',
    inputSchema: ExportToGitBookInputSchema,
    outputSchema: ExportToGitBookOutputSchema,
  },
  async (docs: ExportToGitBookInput): Promise<ExportToGitBookOutput> => {
    const zip = new JSZip();
    const folderName = "AutoDocifyExport"; // Optional: if you want files inside a folder in the zip

    // Add files to the zip.
    // For GitBook import, typically files are at the root of the zip.
    if (docs.readme) zip.file("README.md", docs.readme);
    if (docs.apiDocs) zip.file("API_DOCS.md", docs.apiDocs);
    if (docs.userManual) zip.file("USER_MANUAL.md", docs.userManual);
    if (docs.faq) zip.file("FAQ.md", docs.faq);

    // Generate the zip file content as a base64 string
    const base64Content = await zip.generateAsync({ type: "base64" });
    const fileName = "AutoDocifyExport.zip";

    return {
      fileName: fileName,
      mimeType: "application/zip",
      content: base64Content,
      message: `Successfully generated ${fileName}. Please download and import into GitBook.`,
    };
  }
);

// Exported wrapper function
export async function exportToGitBookFlow(input: ExportToGitBookInput): Promise<ExportToGitBookOutput> {
  return doExportToGitBookFlow(input);
}
