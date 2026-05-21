'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Markdown from '@/components/Markdown';
import MindMap from '@/components/MindMap';
import type { Asset, Notebook } from '@/lib/types';

type AssetWithNotebook = Asset & { notebookTitle: string };

export default function AssetsClient({
  initialAssets,
  notebooks,
}: {
  initialAssets: AssetWithNotebook[];
  notebooks: Notebook[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [filterKind, setFilterKind] = useState<string>('all');
  const [filterNotebook, setFilterNotebook] = useState<string>('all');
  const [open, setOpen] = useState<AssetWithNotebook | null>(null);

  const kinds = Array.from(new Set(assets.map((a) => a.kind)));
  const filtered = assets.filter(
    (a) =>
      (filterKind === 'all' || a.kind === filterKind) &&
      (filterNotebook === 'all' || a.notebookId === filterNotebook),
  );

  async function del(id: string) {
    if (!confirm('Delete asset?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    setAssets((cur) => cur.filter((a) => a.id !== id));
    if (open?.id === id) setOpen(null);
  }

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Assets</h1>
        <p className="text-sm text-ink-muted mt-1">
          Everything Studio has generated across all your notebooks.
        </p>
      </header>

      <div className="flex items-center gap-3 mb-5">
        <select
          className="input max-w-[200px] text-sm"
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value)}
        >
          <option value="all">All kinds</option>
          {kinds.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <select
          className="input max-w-[260px] text-sm"
          value={filterNotebook}
          onChange={(e) => setFilterNotebook(e.target.value)}
        >
          <option value="all">All notebooks</option>
          {notebooks.map((n) => (
            <option key={n.id} value={n.id}>{n.title}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-muted">No assets yet.</div>
      ) : (
        <ul className="grid grid-cols-3 gap-3">
          {filtered.map((a) => (
            <li key={a.id} className="card p-4 hover:border-accent/40 transition">
              <button onClick={() => setOpen(a)} className="text-left w-full">
                <div className="text-sm font-medium truncate">{a.title}</div>
                <div className="text-[11px] text-ink-muted mt-1">
                  {a.kind} · {a.format}
                </div>
                <Link
                  href={`/dashboard/notebooks/${a.notebookId}`}
                  className="text-[10px] text-accent-glow hover:underline mt-1 block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  ← {a.notebookTitle}
                </Link>
                <pre className="mt-3 text-[10px] text-ink-dim line-clamp-3 whitespace-pre-wrap">
                  {a.content.slice(0, 240)}
                </pre>
              </button>
              <div className="mt-3 flex items-center justify-between text-xs">
                <a href={`/api/assets/${a.id}?download=1`} className="text-accent-glow hover:underline">
                  Download
                </a>
                <button onClick={() => del(a.id)} className="text-ink-dim hover:text-bad">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && <AssetDrawer asset={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AssetDrawer({ asset, onClose }: { asset: AssetWithNotebook; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-3xl h-full bg-bg-panel border-l border-bg-line shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-bg-panel border-b border-bg-line px-5 py-3">
          <div>
            <div className="font-medium text-sm truncate">{asset.title}</div>
            <div className="text-[11px] text-ink-muted">{asset.notebookTitle}</div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-sm">✕</button>
        </div>
        <div className="p-5">
          {asset.kind === 'mindmap' || asset.format === 'mermaid' ? (
            <>
              <MindMap source={asset.content} />
              <details className="text-xs mt-4">
                <summary className="cursor-pointer text-ink-muted">View source</summary>
                <pre className="mt-2 text-[11px] whitespace-pre-wrap bg-bg-base border border-bg-line rounded p-3">
                  {asset.content}
                </pre>
              </details>
            </>
          ) : asset.format === 'json' ? (
            <pre className="text-xs whitespace-pre-wrap bg-bg-base border border-bg-line rounded p-3">
              {formatJson(asset.content)}
            </pre>
          ) : (
            <Markdown content={asset.content} />
          )}
        </div>
      </div>
    </div>
  );
}

function formatJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
