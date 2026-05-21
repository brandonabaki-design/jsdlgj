import { notFound } from 'next/navigation';
import { getNotebook, listAssets, listMessages, listSources } from '@/lib/store';
import NotebookClient from './NotebookClient';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  const notebook = getNotebook(params.id);
  if (!notebook) notFound();
  const sources = listSources(notebook.id);
  const messages = listMessages(notebook.id);
  const assets = listAssets(notebook.id);
  return (
    <NotebookClient
      initialNotebook={notebook}
      initialSources={sources}
      initialMessages={messages}
      initialAssets={assets}
    />
  );
}
