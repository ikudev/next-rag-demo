'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    messages: number;
  };
}

export interface ChatWithMessages extends Chat {
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }[];
}

/**
 * Fetch all chats with message counts
 */
export async function getChats(): Promise<Chat[]> {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return chats;
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw new Error('Failed to fetch chats');
  }
}

/**
 * Create a new chat
 */
export async function createChat(title?: string): Promise<Chat> {
  try {
    const chat = await prisma.chat.create({
      data: {
        title: title || 'New Chat',
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    revalidatePath('/');
    return chat;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw new Error('Failed to create chat');
  }
}

/**
 * Get a specific chat with messages
 */
export async function getChat(id: string): Promise<ChatWithMessages | null> {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return chat;
  } catch (error) {
    console.error('Error fetching chat:', error);
    throw new Error('Failed to fetch chat');
  }
}

/**
 * Delete a chat
 */
export async function deleteChat(id: string): Promise<void> {
  try {
    await prisma.chat.delete({
      where: { id },
    });

    revalidatePath('/');
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw new Error('Failed to delete chat');
  }
}
