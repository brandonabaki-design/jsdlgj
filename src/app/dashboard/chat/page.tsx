import { listNotebooks } from '@/lib/store';
import CrossChatClient from './CrossChatClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  const notebooks = listNotebooks();
  return <CrossChatClient notebooks={notebooks} />;
}
