import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteGoal, listGoals, upsertGoal } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ goals: listGoals() });
}

const Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'paused', 'done']).optional(),
  linkedNotebookIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ goal: upsertGoal(parsed.data) });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  deleteGoal(id);
  return NextResponse.json({ ok: true });
}
