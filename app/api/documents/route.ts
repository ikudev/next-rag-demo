import { NextResponse } from 'next/server';
import prisma, { Prisma } from '@/lib/prisma';
import { processDocument } from '@/lib/document-processor';
import { storeEmbeddings } from '@/lib/vector-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    const documents = await prisma.document.findMany({
      where: chatId ? { chatId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
    });

    // Generate and store embeddings
    await storeEmbeddings(document.id, processed.chunks);

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 },
    );
  }
}
