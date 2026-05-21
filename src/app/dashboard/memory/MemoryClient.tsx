'use client';

import { useState } from 'react';
import type { MemoryNote, Notebook } from '@/lib/types';

const CATEGORIES = ['person', 'business', 'tool', 'workflow', 'preference', 'other'];

export default function MemoryClient({
  initialMemory,
  notebooks,
}: {
  initialMemory: MemoryNote[];
  notebooks: Notebook[];
}) {
  const [notes, setNotes] = useState(initialMemory);
  const [editing, setEditing] = useState<Partial<MemoryNote> | null>(null);
  const [watchDir, setWatchDir] = useState('');
  const [watchNotebook, setWatchNotebook] = useState<string>(notebooks[0]?.id ?? '');
  const [watchResult, setWatchResult] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  async function save() {
    if (!editing?.title?.trim() || !editing.content?.trim()) return;
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        title: editing.title,
        category: editing.category || 'other',
        content: editing.content,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setNotes((cur) => {
        const i = cur.findIndex((n) => n.id === data.note.id);
        if (i === -1) return [...cur, data.note];
        return cur.map((n) => (n.id === data.note.id ? data.note : n));
      });
      setEditing(null);
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this memory note?')) return;
    await fetch(`/api/memory?id=${id}`, { method: 'DELETE' });
    setNotes((cur) => cur.filter((n) => n.id !== id));
  }

  async function ingest() {
    if (!watchDir.trim() || !watchNotebook || watching) return;
    setWatching(true);
    setWatchResult(null);
    try {
      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dir: watchDir, notebookId: watchNotebook }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setWatchResult(
        `Added ${data.added.length} file(s)${data.skipped.length ? `, skipped ${data.skipped.length}` : ''}.`,
      );
    } catch (e: any) {
      setWatchResult(`Error: ${e?.message ?? 'unknown'}`);
    } finally {
      setWatching(false);
    }
  }

  const grouped = notes.reduce<Record<string, MemoryNote[]>>((acc, n) => {
    (acc[n.category] ||= []).push(n);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Memory vault</h1>
        <p className="text-sm text-ink-muted mt-1">
          Long-lived facts about you, your business, your tools. Toggle "Use Memory" in any chat to inject this context.
        </p>
      </header>

      <section className="card p-4 mb-6">
        <div className="label mb-2">Ingest a folder into a notebook</div>
        <p className="text-xs text-ink-muted mb-3">
          Drop .md or .txt files into a folder on this machine. Point this at it to bulk-import them as sources.
        </p>
        <div className="grid grid-cols-[1fr_220px_auto] gap-2">
          <input
            className="input text-sm"
            placeholder="/absolute/path/to/inbox"
            value={watchDir}
            onChange={(e) => setWatchDir(e.target.value)}
          />
          <select
            className="input text-sm"
            value={watchNotebook}
            onChange={(e) => setWatchNotebook(e.target.value)}
          >
            <option value="">— pick notebook —</option>
            {notebooks.map((n) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
          <button
            onClick={ingest}
            disabled={watching || !watchDir || !watchNotebook}
            className="btn-primary disabled:opacity-50"
          >
            {watching ? 'Ingesting…' : 'Ingest'}
          </button>
        </div>
        {watchResult && <div className="text-xs text-ink-muted mt-2">{watchResult}</div>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Notes ({notes.length})</h2>
          <button onClick={() => setEditing({ category: 'other' })} className="btn-primary text-xs">
            + New note
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="card p-10 text-center text-sm text-ink-muted">
            No memory notes yet. Add a few facts about yourself or your business.
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-6">
              <div className="label mb-2">{cat}</div>
              <ul className="grid grid-cols-2 gap-3">
                {items.map((n) => (
                  <li key={n.id} className="card p-4 hover:border-accent/40 transition">
                    <button onClick={() => setEditing(n)} className="text-left w-full">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-ink-muted mt-1 whitespace-pre-wrap line-clamp-4">
                        {n.content}
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <button onClick={() => del(n.id)} className="text-xs text-ink-dim hover:text-bad">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60" onClick={() => setEditing(null)}>
          <div
            className="card w-full max-w-xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="label">{editing.id ? 'Edit note' : 'New note'}</div>
            <input
              className="input"
              placeholder="Title"
              value={editing.title ?? ''}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <select
              className="input"
              value={editing.category ?? 'other'}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <textarea
              className="input min-h-[180px]"
              placeholder="Markdown content — facts the agent should know."
              value={editing.content ?? ''}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={save} className="btn-primary text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
