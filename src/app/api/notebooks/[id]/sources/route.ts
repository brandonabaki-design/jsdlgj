import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addSource, deleteSource, getNotebook, listSources } from '@/lib/store';
import { fetchUrlAsSource } from '@/lib/sources';
import { approxTokens } from '@/lib/anthropic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getNotebook(params.id)) {
    return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
  }
  return NextResponse.json({ sources: listSources(params.id) });
}

const AddSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('url'), url: z.string().url() }),
  z.object({
    type: z.literal('text'),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(800_000),
  }),
  z.object({
    type: z.literal('markdown'),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(800_000),
  }),
]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!getNotebook(params.id)) {
    return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let title: string;
  let content: string;
  let url: string | undefined;

  if (parsed.data.type === 'url') {
    try {
      const fetched = await fetchUrlAsSource(parsed.data.url);
      title = fetched.title;
      content = fetched.content;
      url = fetched.url;
    } catch (e: any) {
      return NextResponse.json(
        { error: `URL fetch failed: ${e?.message ?? 'unknown'}` },
        { status: 400 },
      );
    }
  } else {
    title = parsed.data.title;
    content = parsed.data.content;
  }

  if (!content.trim()) {
    return NextResponse.json({ error: 'Empty source content' }, { status: 400 });
  }

  const s = addSource({
    notebookId: params.id,
    title,
    type: parsed.data.type,
    url,
    content,
    tokens: approxTokens(content),
  });

  return NextResponse.json({ source: s }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const sourceId = url.searchParams.get('sourceId');
  if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });
  deleteSource(sourceId);
  return NextResponse.json({ ok: true });
}
