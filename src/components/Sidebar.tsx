'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '⌂' },
  { href: '/dashboard/notebooks', label: 'Notebooks', icon: '📓' },
  { href: '/dashboard/chat', label: 'Cross-notebook chat', icon: '💬' },
  { href: '/dashboard/assets', label: 'Assets', icon: '🗂' },
  { href: '/dashboard/goals', label: 'Goals', icon: '🎯' },
  { href: '/dashboard/memory', label: 'Memory', icon: '🧠' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-bg-line bg-bg-panel">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-bg-line">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-accent-glow text-sm">
          ✦
        </div>
        <div className="text-sm font-semibold">Agent OS Notebook</div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const active =
            pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                active ? 'bg-bg-elev text-ink' : 'text-ink-muted hover:bg-bg-elev hover:text-ink'
              }`}
            >
              <span className="text-base">{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-bg-line p-3 text-[11px] text-ink-dim leading-relaxed">
        Local Claude-powered NotebookLM.
        <br />
        Sources never leave your machine except as API calls to Anthropic.
      </div>
    </aside>
  );
}
