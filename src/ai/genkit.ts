import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {openAI} from '@genkit-ai/openai'; // Temporarily commented out due to installation issues

const plugins = [];

// Google AI Plugin (already configured)
plugins.push(googleAI());

// OpenAI Plugin configured for OpenRouter - Temporarily disabled
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
if (openRouterApiKey) {
  // plugins.push(
  //   openAI({ // Usage of the imported 'openAI'
  //     apiKey: openRouterApiKey,
  //     baseURL: 'https://openrouter.ai/api/v1',
  //   })
  // );
  console.warn(
    'OpenRouter configuration is temporarily disabled due to an issue installing the @genkit-ai/openai package. OPENROUTER_API_KEY is set but will not be used.'
  );
} else {
  // console.warn( // Original warning if key wasn't set, less relevant now
  //   'OPENROUTER_API_KEY is not set in .env. OpenRouter models will not be available.'
  // );
}

export const ai = genkit({
  plugins: plugins,
  // The default model remains gemini-2.0-flash.
  // To use an OpenRouter model, specify it in your flow, e.g., model: 'openai/gpt-3.5-turbo'
  // (The 'openai/' prefix tells Genkit to use the openAI plugin for these models).
  // Make sure the model name matches what OpenRouter expects.
  model: 'googleai/gemini-2.0-flash',
});
