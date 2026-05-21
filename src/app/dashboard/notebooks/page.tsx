import { listNotebooks, listSources } from '@/lib/store';
import NotebooksClient from './NotebooksClient';

export const dynamic = 'force-dynamic';

export default function NotebooksPage() {
  const notebooks = listNotebooks().map((n) => ({
    ...n,
    sourceCount: listSources(n.id).length,
  }));
  return <NotebooksClient initialNotebooks={notebooks} />;
}
