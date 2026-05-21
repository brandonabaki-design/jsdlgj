import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid h-screen place-items-center text-center">
      <div>
        <div className="text-2xl mb-2">Notebook not found</div>
        <Link href="/dashboard/notebooks" className="text-accent-glow hover:underline text-sm">
          ← Back to notebooks
        </Link>
      </div>
    </div>
  );
}
