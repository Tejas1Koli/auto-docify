"use server";

import { generateDocumentation, GenerateDocumentationInput, GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
import { regenerateDocumentationSection, RegenerateDocumentationSectionOutput } from '@/ai/flows/regenerate-documentation-section';

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
  codebase: string, // Assuming this is still the original input for context
  sectionName: string,
  tone: string,
  uiOnlyMode: boolean // Pass uiOnlyMode to potentially influence regeneration context
): Promise<ActionResult<RegenerateDocumentationSectionOutput>> {
  try {
    // Note: regenerateDocumentationSection flow might also need uiOnlyMode if its prompt should adapt
    const result = await regenerateDocumentationSection({
      codebase, // This might need to be the UI description if uiOnlyMode was true for initial generation
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
  // Placeholder for actual PDF generation logic
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
  return { message: "PDF export initiated! Full functionality coming soon.", data: { status: "PDF export started (placeholder)" } };
}

export async function handleExportToNotion(docs: GenerateDocumentationOutput): Promise<ActionResult<{ status: string }>> {
  console.log("Attempting to export to Notion (not yet implemented):", docs.readme.substring(0, 100) + "...");
  // Placeholder for actual Notion API calls
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
  return { message: "Notion export initiated! Full functionality coming soon.", data: { status: "Notion export started (placeholder)" } };
}

export async function handleExportToGitBook(docs: GenerateDocumentationOutput): Promise<ActionResult<{ status: string }>> {
  console.log("Attempting to export to GitBook (not yet implemented):", docs.readme.substring(0, 100) + "...");
  // Placeholder for actual GitBook API calls
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
  return { message: "GitBook export initiated! Full functionality coming soon.", data: { status: "GitBook export started (placeholder)" } };
}
