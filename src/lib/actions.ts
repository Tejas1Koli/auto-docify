
"use server";

import { generateDocumentation, GenerateDocumentationInput, GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
import { regenerateDocumentationSection, RegenerateDocumentationSectionOutput } from '@/ai/flows/regenerate-documentation-section';
import { exportToGitBookFlow, ExportToGitBookOutput } from '@/ai/flows/export-to-gitbook-flow';


interface ActionResult<T> {
  data?: T;
  error?: string;
  message?: string; // For user feedback
}

export async function handleGenerateDocs(
  codebaseInput: string,
  uiOnlyMode: boolean
): Promise<ActionResult<GenerateDocumentationOutput>> {
  try {
    const input: GenerateDocumentationInput = { codebase: codebaseInput, uiOnlyMode: uiOnlyMode };
    const result = await generateDocumentation(input);
    return { data: result };
  } catch (error: any) {
    console.error("Error generating documentation:", error);
    return { error: error.message || "Failed to generate documentation." };
  }
}

export async function handleRegenerateSection(
  codebase: string, 
  sectionName: string,
  tone: string,
  uiOnlyMode: boolean 
): Promise<ActionResult<RegenerateDocumentationSectionOutput>> {
  try {
    const result = await regenerateDocumentationSection({
      codebase, 
      sectionName,
      tone,
    });
    return { data: result };
  } catch (error: any) {
    console.error("Error regenerating section:", error);
    return { error: error.message || "Failed to regenerate section." };
  }
}

export async function handleExportToPDF(docs: GenerateDocumentationOutput): Promise<ActionResult<{ status: string }>> {
  console.log("Attempting to export to PDF (not yet implemented):", docs.readme.substring(0, 100) + "...");
  await new Promise(resolve => setTimeout(resolve, 1000)); 
  return { message: "PDF export initiated! Full functionality coming soon.", data: { status: "PDF export started (placeholder)" } };
}

export async function handleExportToNotion(docs: GenerateDocumentationOutput): Promise<ActionResult<{ status: string }>> {
  console.log("Attempting to export to Notion (not yet implemented):", docs.readme.substring(0, 100) + "...");
  await new Promise(resolve => setTimeout(resolve, 1000)); 
  return { message: "Notion export initiated! Full functionality coming soon.", data: { status: "Notion export started (placeholder)" } };
}

export async function handleExportToGitBook(docs: GenerateDocumentationOutput): Promise<ActionResult<ExportToGitBookOutput>> {
  try {
    console.log("Attempting to export to GitBook:", docs.readme.substring(0, 50) + "...");
    const result = await exportToGitBookFlow(docs);
    if (result.success) {
      return { message: result.message, data: result };
    } else {
      return { error: result.message, data: result };
    }
  } catch (error: any) {
    console.error("Error initiating GitBook export:", error);
    return { error: error.message || "Failed to initiate GitBook export." };
  }
}
