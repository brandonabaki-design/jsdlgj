import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClient, DEFAULT_MODEL, buildSourcesContext } from '@/lib/anthropic';
import { listMemory, listNotebooks, listSources } from '@/lib/store';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
  notebookIds: z.array(z.string()).optional(),
  useMemory: z.boolean().optional(),
});

const SYSTEM = `You are the cross-notebook research assistant for a local Claude-powered NotebookLM.
You can see sources drawn from MULTIPLE notebooks. Each source block includes its notebook title.
Rules:
- Cite every non-trivial claim as [Source N] using the numeric id.
- When the user asks "where does X appear?" or "which notebooks cover Y?", group your answer by notebook.
- If the sources don't cover the question, say so plainly.
- Be direct and concise. Use short sections.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const notebooks = listNotebooks();
  const targetIds = new Set(parsed.data.notebookIds ?? notebooks.map((n) => n.id));
  const titleById = Object.fromEntries(notebooks.map((n) => [n.id, n.title]));

  let i = 1;
  const sourceBlocks = [];
  for (const id of targetIds) {
    for (const s of listSources(id)) {
      sourceBlocks.push({
        index: i++,
        title: `[${titleById[id] ?? 'notebook'}] ${s.title}`,
        url: s.url,
        content: s.content,
      });
    }
  }

  const memory = parsed.data.useMemory
    ? listMemory().map((n) => `## ${n.title} (${n.category})\n${n.content}`).join('\n\n').slice(0, 30_000)
    : '';

  const systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
    { type: 'text', text: SYSTEM },
  ];
  if (sourceBlocks.length) {
    systemBlocks.push({
      type: 'text',
      text: `<sources>\n${buildSourcesContext(sourceBlocks)}\n</sources>`,
      cache_control: { type: 'ephemeral' },
    });
  }
  if (memory) {
    systemBlocks.push({ type: 'text', text: `<memory>\n${memory}\n</memory>` });
  }

  const encoder = new TextEncoder();
  const client = getClient();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sse = await client.messages.stream({
          model: DEFAULT_MODEL,
          max_tokens: 2048,
          system: systemBlocks,
          messages: [{ role: 'user', content: parsed.data.message }],
        });
        for await (const event of sse) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`),
            );
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: e?.message ?? 'stream error' })}\n\n`),
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
