import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  addMessage,
  clearMessages,
  getNotebook,
  listMemory,
  listMessages,
  listSources,
} from '@/lib/store';
import { extractCitations, streamChat } from '@/lib/chat';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
  useMemory: z.boolean().optional(),
});

function memorySnippet(): string {
  const notes = listMemory();
  if (!notes.length) return '';
  return notes
    .map((n) => `## ${n.title} (${n.category})\n${n.content}`)
    .join('\n\n')
    .slice(0, 30_000);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const nb = getNotebook(params.id);
  if (!nb) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const history = listMessages(params.id);
  const sources = listSources(params.id).map((s, i) => ({
    index: i + 1,
    title: s.title,
    url: s.url,
    content: s.content,
  }));

  // Persist the user's message before streaming so it survives client disconnects.
  addMessage(params.id, { role: 'user', content: parsed.data.message });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let acc = '';
      try {
        const sse = await streamChat({
          sources,
          history,
          userMessage: parsed.data.message,
          memoryContext: parsed.data.useMemory ? memorySnippet() : undefined,
        });
        for await (const event of sse) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            acc += event.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`),
            );
          }
        }
        const citations = extractCitations(acc);
        const stored = addMessage(params.id, {
          role: 'assistant',
          content: acc,
          citations,
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, citations, messageId: stored.id })}\n\n`,
          ),
        );
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: e?.message ?? 'stream error' })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  clearMessages(params.id);
  return NextResponse.json({ ok: true });
}
