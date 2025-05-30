
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-documentation.ts';
import '@/ai/flows/gpt-4-documentation-generation.ts';
import '@/ai/flows/regenerate-documentation-section.ts';
import '@/ai/flows/generate-structured-prompts.ts';
import '@/ai/flows/export-to-gitbook-flow.ts';
