'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Notebook } from '@/lib/types';

type WithCount = Notebook & { sourceCount: number };

export default function NotebooksClient({ initialNotebooks }: { initialNotebooks: WithCount[] }) {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');

  async function createNotebook(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      router.push(`/dashboard/notebooks/${data.notebook.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteNotebook(id: string) {
    if (!confirm('Delete this notebook and all its sources/assets?')) return;
    await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
    setNotebooks((ns) => ns.filter((n) => n.id !== id));
  }

  const filtered = q
    ? notebooks.filter(
        (n) =>
          n.title.toLowerCase().includes(q.toLowerCase()) ||
          n.description.toLowerCase().includes(q.toLowerCase()),
      )
    : notebooks;

  return (
    <div className="p-8 max-w-5xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Notebooks</h1>
          <p className="text-sm text-ink-muted mt-1">
            Each notebook is a container of sources you can chat with and generate content from.
          </p>
        </div>
      </header>

      <form onSubmit={createNotebook} className="card p-4 mb-6 space-y-3">
        <div className="label">New notebook</div>
        <input
          className="input"
          placeholder="Title (e.g. AI Agent Frameworks 2026)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input min-h-[60px]"
          placeholder="Optional: a short description of what's in this notebook"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-dim">
            You'll add sources (URLs, pasted text, markdown) on the next screen.
          </span>
          <button type="submit" disabled={creating || !title.trim()} className="btn-primary disabled:opacity-50">
            {creating ? 'Creating…' : 'Create notebook'}
          </button>
        </div>
      </form>

      <div className="mb-4">
        <input
          className="input"
          placeholder="Search notebooks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-muted">
          {notebooks.length === 0
            ? 'No notebooks yet. Create one above.'
            : 'No matches for that search.'}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {filtered.map((n) => (
            <li key={n.id} className="card p-4 hover:border-accent/40 transition">
              <Link href={`/dashboard/notebooks/${n.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{n.title}</div>
                    {n.description && (
                      <div className="text-xs text-ink-muted mt-1 line-clamp-2">{n.description}</div>
                    )}
                  </div>
                  {n.pinned && <span className="chip">pinned</span>}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-ink-muted">
                  <span>{n.sourceCount} sources</span>
                  <span>·</span>
                  <span>{n.assetIds.length} assets</span>
                  <span>·</span>
                  <span>{n.messageIds.length} messages</span>
                </div>
              </Link>
              <div className="mt-3 flex items-center justify-end">
                <button
                  onClick={() => deleteNotebook(n.id)}
                  className="text-xs text-ink-dim hover:text-bad"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
