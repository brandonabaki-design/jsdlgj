import { listMemory, listNotebooks } from '@/lib/store';
import MemoryClient from './MemoryClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <MemoryClient initialMemory={listMemory()} notebooks={listNotebooks()} />;
}
