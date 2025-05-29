"use server";

import { generateDocumentation, GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
import { regenerateDocumentationSection, RegenerateDocumentationSectionOutput } from '@/ai/flows/regenerate-documentation-section';

interface ActionResult<T> {
  data?: T;
  error?: string;
}

export async function handleGenerateDocs(
  codebaseInput: string,
  uiOnlyMode: boolean // This param is kept for future use, not directly used by current generateDocumentation flow
): Promise<ActionResult<GenerateDocumentationOutput>> {
  try {
    // uiOnlyMode is not directly used by generateDocumentation flow as per its definition.
    // If needed, a different flow or modification to current flow would be required.
    const result = await generateDocumentation({ codebase: codebaseInput });
    return { data: result };
  } catch (error: any) {
    console.error("Error generating documentation:", error);
    return { error: error.message || "Failed to generate documentation." };
  }
}

export async function handleRegenerateSection(
  codebase: string,
  sectionName: string,
  tone: string
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
