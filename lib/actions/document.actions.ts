'use server';

import prisma, { Prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { processDocument } from '@/lib/document-processor';
import { storeEmbeddings } from '@/lib/vector-store';

export interface Document {
  id: string;
  filename: string;
  chatId: string | null;
  createdAt: Date;
  _count?: {
    embeddings: number;
  };
}

/**
 * Fetch documents, optionally filtered by chatId
 */
export async function getDocuments(
  chatId?: string | null,
): Promise<Document[]> {
  try {
    const documents = await prisma.document.findMany({
      where: chatId !== undefined ? { chatId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    return documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw new Error('Failed to fetch documents');
  }
}

/**
 * Upload and process a document
 */
export async function uploadDocument(formData: FormData): Promise<Document> {
  try {
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string | null;

    if (!file) {
      throw new Error('No file provided');
    }

    // Read file content
    const content = await file.text();

    // Process document (chunk it)
    const processed = await processDocument(file.name, content, {
      size: file.size,
      type: file.type,
    });

    // Store document in database
    const document = await prisma.document.create({
      data: {
        filename: processed.filename,
        content: processed.content,
        chatId: chatId || null,
        metadata: (processed.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    // Generate and store embeddings
    await storeEmbeddings(document.id, processed.chunks);

    revalidatePath('/');
    return document;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error('Failed to upload document');
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  try {
    await prisma.document.delete({
      where: { id },
    });

    revalidatePath('/');
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error('Failed to delete document');
  }
}

/**
 * Update document's chat association
 */
export async function updateDocument(
  id: string,
  chatId: string | null,
): Promise<Document> {
  try {
    const document = await prisma.document.update({
      where: { id },
      data: { chatId: chatId || null },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    revalidatePath('/');
    return document;
  } catch (error) {
    console.error('Error updating document:', error);
    throw new Error('Failed to update document');
  }
}
