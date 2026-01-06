import { streamText } from 'ai';
import { aiModel } from '@/lib/ai-config';
import prisma from '@/lib/prisma';
import { searchSimilarChunks, formatContextForLLM } from '@/lib/vector-store';

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: chatId } = await params;
    const { messages } = await request.json();

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];

    // Search for relevant context using RAG
    const relevantChunks = await searchSimilarChunks(
      latestMessage.content,
      chatId,
    );

    // Format context for the LLM
    const context = await formatContextForLLM(relevantChunks);

    // Prepare messages with context
    const messagesWithContext = context
      ? [
          {
            role: 'system' as const,
            content: context,
          },
          ...messages,
        ]
      : messages;

    // Stream the response
    const result = streamText({
      model: aiModel,
      messages: messagesWithContext,
      async onFinish({ text }) {
        // Save user message
        await prisma.message.create({
          data: {
            chatId,
            role: 'user',
            content: latestMessage.content,
          },
        });

        // Save assistant message
        await prisma.message.create({
          data: {
            chatId,
            role: 'assistant',
            content: text,
          },
        });

        // Update chat timestamp
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in chat completion:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process message' }),
      { status: 500 },
    );
  }
}
