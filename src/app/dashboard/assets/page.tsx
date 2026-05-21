import { listAssets, listNotebooks } from '@/lib/store';
import AssetsClient from './AssetsClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  const notebooks = listNotebooks();
  const titleById = Object.fromEntries(notebooks.map((n) => [n.id, n.title]));
  const assets = listAssets().map((a) => ({
    ...a,
    notebookTitle: titleById[a.notebookId] ?? '—',
  }));
  return <AssetsClient initialAssets={assets} notebooks={notebooks} />;
}
