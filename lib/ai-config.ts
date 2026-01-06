import { google } from '@ai-sdk/google';

export const aiModel = google('gemini-2.0-flash-exp', {
  // Optional: Configure via Vercel AI Gateway
  // baseURL: process.env.VERCEL_AI_GATEWAY_URL,
});

export const embeddingModel = 'text-embedding-004';

export const AI_CONFIG = {
  chatModel: 'gemini-2.0-flash-exp',
  embeddingModel: 'text-embedding-004',
  embeddingDimensions: 768,
  maxTokens: 8192,
  temperature: 0.7,
  topK: 5, // Number of relevant chunks to retrieve for RAG
};
