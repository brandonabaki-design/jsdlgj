import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteMemory, listMemory, upsertMemory } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ memory: listMemory() });
}

const Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  content: z.string().min(1).max(50_000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ note: upsertMemory(parsed.data) });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  deleteMemory(id);
  return NextResponse.json({ ok: true });
}
