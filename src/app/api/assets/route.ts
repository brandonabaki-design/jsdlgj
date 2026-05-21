import { NextResponse } from 'next/server';
import { listAssets, listNotebooks } from '@/lib/store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const notebookId = url.searchParams.get('notebookId') ?? undefined;
  const assets = listAssets(notebookId);
  const notebooks = listNotebooks();
  const notebookMap = Object.fromEntries(notebooks.map((n) => [n.id, n.title]));
  return NextResponse.json({
    assets: assets.map((a) => ({ ...a, notebookTitle: notebookMap[a.notebookId] ?? '—' })),
  });
}
