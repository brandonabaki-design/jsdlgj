import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createNotebook, listNotebooks } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ notebooks: listNotebooks() });
}

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const n = createNotebook(parsed.data);
  return NextResponse.json({ notebook: n }, { status: 201 });
}
