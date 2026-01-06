import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import prisma from '@/lib/prisma';
import { AI_CONFIG } from '@/lib/ai-config';

/**
 * Generate embeddings for a given text using Google's text-embedding-004 model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: text,
  });

  return embedding;
}

/**
 * Store embeddings for document chunks in the database
 * @param documentId - The document ID to associate embeddings with
 * @param chunks - Array of text chunks from the document
 */
export async function storeEmbeddings(
  documentId: string,
  chunks: string[],
): Promise<void> {
  // Generate embeddings for all chunks
  const embeddingsData = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk);
      return {
        documentId,
        chunkText: chunk,
        chunkIndex: index,
        embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
      };
    }),
  );

  // Store all embeddings in the database
  await prisma.$executeRaw`
    INSERT INTO embeddings (id, document_id, chunk_text, chunk_index, embedding, created_at)
    VALUES ${embeddingsData
      .map(
        (data) => `(
        gen_random_uuid()::text,
        ${data.documentId}::text,
        ${data.chunkText}::text,
        ${data.chunkIndex}::int,
        ${data.embedding}::vector,
        NOW()
      )`,
      )
      .join(', ')}
  `;
}

/**
 * Search for similar document chunks using vector similarity
 * @param query - The search query text
 * @param chatId - The chat ID to search within (also includes global documents)
 * @param topK - Number of results to return (default from AI_CONFIG)
 */
export async function searchSimilarChunks(
  query: string,
  chatId: string,
  topK: number = AI_CONFIG.topK,
) {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Convert the embedding array to a PostgreSQL vector format
  const vectorString = `[${queryEmbedding.join(',').slice(0, 10000)}]`;

  // Search for similar chunks using pgvector's cosine similarity
  // We search in both chat-specific documents and global documents (chatId = null)
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      chunk_text: string;
      chunk_index: number;
      document_id: string;
      filename: string;
      similarity: number;
    }>
  >`
    SELECT
      e.id,
      e.chunk_text,
      e.chunk_index,
      e.document_id,
      d.filename,
      1 - (e.embedding <=> ${vectorString}::vector) as similarity
    FROM embeddings e
    JOIN documents d ON e.document_id = d.id
    WHERE d.chat_id = ${chatId} OR d.chat_id IS NULL
    ORDER BY e.embedding <=> ${vectorString}::vector
    LIMIT ${topK}
  `;

  return results;
}

/**
 * Format retrieved chunks into context for the LLM
 */
export async function formatContextForLLM(
  chunks: Array<{
    id: string;
    chunk_text: string;
    chunk_index: number;
    document_id: string;
    filename: string;
    similarity: number;
  }>,
): Promise<string> {
  if (chunks.length === 0) {
    return '';
  }

  // Group chunks by document
  const chunksByDocument = chunks.reduce(
    (acc, chunk) => {
      if (!acc[chunk.filename]) {
        acc[chunk.filename] = [];
      }
      acc[chunk.filename].push(chunk);
      return acc;
    },
    {} as Record<string, typeof chunks>,
  );

  // Format the context
  const contextParts = [
    "You have access to the following relevant information from the user's documents:",
    '',
  ];

  for (const [filename, docChunks] of Object.entries(chunksByDocument)) {
    contextParts.push(`## From: ${filename}`);
    contextParts.push('');

    // Sort chunks by index to maintain document order
    const sortedChunks = docChunks.sort(
      (a, b) => a.chunk_index - b.chunk_index,
    );

    for (const chunk of sortedChunks) {
      contextParts.push(chunk.chunk_text);
      contextParts.push('');
    }

    contextParts.push('---');
    contextParts.push('');
  }

  contextParts.push(
    "Please use this information to answer the user's question. If the information is not relevant, you can ignore it.",
  );

  return contextParts.join('\n');
}
