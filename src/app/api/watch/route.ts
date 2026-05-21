import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { addSource, getNotebook } from '@/lib/store';
import { approxTokens } from '@/lib/anthropic';

const Schema = z.object({
  notebookId: z.string().min(1),
  dir: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { notebookId, dir } = parsed.data;
  if (!getNotebook(notebookId)) {
    return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
  }
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return NextResponse.json({ error: `Not a directory: ${abs}` }, { status: 400 });
  }

  const allowed = ['.md', '.markdown', '.txt'];
  const entries = fs
    .readdirSync(abs)
    .filter((f) => allowed.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(abs, f));

  const added: string[] = [];
  const skipped: string[] = [];
  for (const file of entries) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.trim()) {
        skipped.push(file);
        continue;
      }
      const ext = path.extname(file).toLowerCase();
      addSource({
        notebookId,
        title: path.basename(file, ext),
        type: ext === '.md' || ext === '.markdown' ? 'markdown' : 'text',
        content,
        tokens: approxTokens(content),
      });
      added.push(file);
    } catch {
      skipped.push(file);
    }
  }

  return NextResponse.json({ added, skipped });
}
