import { listGoals, listNotebooks } from '@/lib/store';
import GoalsClient from './GoalsClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <GoalsClient initialGoals={listGoals()} notebooks={listNotebooks()} />;
}
