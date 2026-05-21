import { NextResponse } from 'next/server';
import { getNotebook, listSources } from '@/lib/store';
import { buildZipForNotebookLM } from '@/lib/export';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const nb = getNotebook(params.id);
  if (!nb) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
  const { filename, bytes } = buildZipForNotebookLM(nb, listSources(params.id));
  const body = new Blob([new Uint8Array(bytes)], { type: 'application/zip' });
  return new Response(body, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${filename}"`,
      'content-length': String(bytes.length),
    },
  });
}
