# RAG Demo Application

A full-featured Retrieval-Augmented Generation (RAG) demo application built with Next.js, Google Gemini, and Prisma Postgres.

## Features

- **3-Column Layout**:
  - **Left**: Chat list with create, select, and delete functionality
  - **Middle**: Main chat interface with streaming AI responses
  - **Right**: File explorer with chat-specific and global document sections

- **RAG Capabilities**:
  - Upload documents (text, markdown, JSON)
  - Automatic document chunking and embedding generation
  - Vector similarity search using pgvector
  - Context-aware AI responses powered by Google Gemini

- **Tech Stack**:
  - Next.js 16 with App Router
  - Google Gemini (gemini-2.0-flash-exp) for chat
  - Google text-embedding-004 for embeddings
  - Vercel AI SDK for streaming responses
  - LangChain.js for document processing
  - Prisma 7 with Postgres and pgvector
  - shadcn-ui for UI components
  - Tailwind CSS v4 for styling

## Prerequisites

- Node.js 20+ and pnpm
- PostgreSQL database with pgvector extension (or Prisma Postgres)
- Google AI API key

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory (see `env-template.txt` for reference):

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-api-key-here"
```

**Get a Google AI API Key:**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy it to your `.env.local` file

### 3. Set Up Database

**Important**: This project uses **Prisma ORM 7** which requires specific configuration.

**Option A: Using Prisma Postgres (Recommended)**

1. Create a new Prisma Postgres database at [Prisma Data Platform](https://console.prisma.io/)
2. Copy your connection string to `.env.local`

**Option B: Using Existing PostgreSQL**

1. Ensure your PostgreSQL database has the pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. Update your `DATABASE_URL` in `.env.local`

### 4. Run Database Migrations

**Important**: Prisma 7 requires running `prisma generate` separately from migrations.

```bash
# Generate Prisma Client first
npx prisma generate

# Then run migrations
npx prisma migrate dev --name init
```

This will:
- Generate the Prisma Client in `generated/prisma/`
- Create the necessary tables (chats, messages, documents, embeddings)
- Enable the pgvector extension

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Creating a Chat

1. Click the "New Chat" button in the left sidebar
2. The new chat will be automatically selected

### Uploading Documents

**Chat-Specific Documents:**
1. Select a chat from the left sidebar
2. In the right panel (upper section), click "Upload"
3. Select a text file (.txt, .md, .json)
4. The document will be processed and embedded

**Global Documents:**
1. In the right panel (lower section), click "Upload"
2. Select a text file
3. This document will be available to all chats

### Chatting with RAG

1. Select a chat
2. Type your message in the input at the bottom
3. Press Enter or click Send
4. The AI will search for relevant document chunks and provide context-aware responses

### Managing Documents

- **View**: Documents are listed in the right panel with chunk count and upload time
- **Delete**: Click the trash icon next to any document to remove it

### Managing Chats

- **Select**: Click on any chat in the left sidebar
- **Delete**: Click the trash icon next to a chat to remove it (this also deletes all messages)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chats/          # Chat management endpoints
│   │   └── documents/      # Document upload and management
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main 3-column layout
├── components/
│   ├── ui/                 # shadcn-ui components
│   ├── chat-list.tsx       # Left column: Chat list
│   ├── chat-interface.tsx  # Middle column: Chat UI
│   └── file-explorer.tsx   # Right column: File management
├── generated/
│   └── prisma/             # Generated Prisma Client (Prisma 7)
├── lib/
│   ├── ai-config.ts        # Google Gemini configuration
│   ├── document-processor.ts # Document chunking
│   ├── prisma.ts           # Prisma client with adapter
│   └── vector-store.ts     # Embedding and search logic
├── prisma/
│   └── schema.prisma       # Database schema with pgvector
├── prisma.config.ts        # Prisma 7 configuration
└── env-template.txt        # Environment variables template
```

## API Routes

- `GET /api/chats` - List all chats
- `POST /api/chats` - Create a new chat
- `GET /api/chats/[id]` - Get chat with messages
- `DELETE /api/chats/[id]` - Delete a chat
- `POST /api/chats/[id]/messages` - Send message and get streaming response
- `GET /api/documents` - List documents (optional chatId filter)
- `POST /api/documents` - Upload and process document
- `DELETE /api/documents/[id]` - Delete document
- `PATCH /api/documents/[id]` - Update document (e.g., move between chat/global)

## Configuration

### AI Models

Edit `lib/ai-config.ts` to change models:

```typescript
export const AI_CONFIG = {
  chatModel: 'gemini-2.0-flash-exp',
  embeddingModel: 'text-embedding-004',
  embeddingDimensions: 768,
  maxTokens: 8192,
  temperature: 0.7,
  topK: 5, // Number of relevant chunks to retrieve
}
```

### Document Chunking

Edit `lib/document-processor.ts` to adjust chunking:

```typescript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' ', ''],
})
```

## Troubleshooting

### Database Connection Issues

- Ensure your `DATABASE_URL` is correct
- Check that pgvector extension is installed
- Verify your database is accessible

### Prisma Client Errors

```bash
npx prisma generate
```

### Build Errors

```bash
rm -rf .next
pnpm build
```

### Missing Types

```bash
pnpm add -D @types/pg
```

## License

MIT
