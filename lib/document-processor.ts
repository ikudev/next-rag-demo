import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface ProcessedDocument {
  filename: string;
  content: string;
  chunks: string[];
  metadata?: Record<string, unknown>;
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

export async function processDocument(
  filename: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<ProcessedDocument> {
  // Split the document into chunks
  const chunks = await textSplitter.splitText(content);

  return {
    filename,
    content,
    chunks,
    metadata,
  };
}

export function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
