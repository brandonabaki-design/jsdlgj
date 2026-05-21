import { NextResponse } from 'next/server';
import { deleteAsset, getAsset } from '@/lib/store';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const a = getAsset(params.id);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const url = new URL(req.url);
  if (url.searchParams.get('download')) {
    const ext = a.format === 'json' ? 'json' : a.format === 'mermaid' ? 'mmd' : 'md';
    const filename = `${a.title.replace(/[^\w.-]+/g, '_').slice(0, 80)}.${ext}`;
    const contentType = a.format === 'json' ? 'application/json' : 'text/plain; charset=utf-8';
    return new Response(a.content, {
      headers: {
        'content-type': contentType,
        'content-disposition': `attachment; filename="${filename}"`,
      },
    });
  }
  return NextResponse.json({ asset: a });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  deleteAsset(params.id);
  return NextResponse.json({ ok: true });
}
