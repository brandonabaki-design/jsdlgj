import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deleteNotebook,
  getNotebook,
  listAssets,
  listMessages,
  listSources,
  updateNotebook,
} from '@/lib/store';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const nb = getNotebook(params.id);
  if (!nb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    notebook: nb,
    sources: listSources(nb.id),
    messages: listMessages(nb.id),
    assets: listAssets(nb.id),
  });
}

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const nb = updateNotebook(params.id, parsed.data);
  if (!nb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ notebook: nb });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  deleteNotebook(params.id);
  return NextResponse.json({ ok: true });
}
