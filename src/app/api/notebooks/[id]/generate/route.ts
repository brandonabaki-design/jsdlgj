import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addAsset, getNotebook, listSources } from '@/lib/store';
import { generateAsset } from '@/lib/generators';
import type { AssetKind } from '@/lib/types';

const KINDS: AssetKind[] = [
  'briefing',
  'mindmap',
  'flashcards',
  'faq',
  'study-guide',
  'podcast-script',
  'infographic-spec',
  'quiz',
  'slide-deck',
];

const BodySchema = z.object({
  kind: z.enum(KINDS as [AssetKind, ...AssetKind[]]),
  extraInstructions: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const nb = getNotebook(params.id);
  if (!nb) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sources = listSources(params.id);
  if (!sources.length) {
    return NextResponse.json(
      { error: 'Add at least one source before generating' },
      { status: 400 },
    );
  }

  try {
    const result = await generateAsset({
      kind: parsed.data.kind,
      sources: sources.map((s, i) => ({
        index: i + 1,
        title: s.title,
        url: s.url,
        content: s.content,
      })),
      notebookTitle: nb.title,
      notebookDescription: nb.description,
      extraInstructions: parsed.data.extraInstructions,
    });
    const asset = addAsset({
      notebookId: params.id,
      kind: parsed.data.kind,
      title: result.title,
      format: result.format,
      content: result.content,
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Generation failed' }, { status: 500 });
  }
}
