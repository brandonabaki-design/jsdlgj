'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Goal, Notebook } from '@/lib/types';

export default function GoalsClient({
  initialGoals,
  notebooks,
}: {
  initialGoals: Goal[];
  notebooks: Notebook[];
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          linkedNotebookIds: [...linked],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoals((cur) => [data.goal, ...cur]);
        setTitle('');
        setDescription('');
        setLinked(new Set());
      }
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, patch: Partial<Goal>) {
    const existing = goals.find((g) => g.id === id);
    if (!existing) return;
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...existing, ...patch }),
    });
    const data = await res.json();
    if (res.ok) setGoals((cur) => cur.map((g) => (g.id === id ? data.goal : g)));
  }

  async function del(id: string) {
    if (!confirm('Delete goal?')) return;
    await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
    setGoals((cur) => cur.filter((g) => g.id !== id));
  }

  function toggleLink(id: string) {
    const next = new Set(linked);
    next.has(id) ? next.delete(id) : next.add(id);
    setLinked(next);
  }

  const notebookTitle = (id: string) => notebooks.find((n) => n.id === id)?.title ?? '—';

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-sm text-ink-muted mt-1">
          Track what you're working on. Link goals to notebooks so context stays connected.
        </p>
      </header>

      <form onSubmit={create} className="card p-4 mb-6 space-y-3">
        <div className="label">New goal</div>
        <input
          className="input"
          placeholder="What are you trying to achieve?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input min-h-[60px]"
          placeholder="Optional details, success criteria, deadline."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {notebooks.length > 0 && (
          <div>
            <div className="label mb-2">Link notebooks</div>
            <div className="flex flex-wrap gap-2">
              {notebooks.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => toggleLink(n.id)}
                  className={`chip ${linked.has(n.id) ? '!bg-accent/20 !text-accent-glow !border-accent/40' : ''}`}
                >
                  {n.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy || !title.trim()}>
            {busy ? 'Adding…' : 'Add goal'}
          </button>
        </div>
      </form>

      {goals.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-muted">No goals yet.</div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{g.title}</div>
                  {g.description && (
                    <div className="text-xs text-ink-muted mt-1 whitespace-pre-wrap">{g.description}</div>
                  )}
                  {g.linkedNotebookIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.linkedNotebookIds.map((id) => (
                        <Link
                          key={id}
                          href={`/dashboard/notebooks/${id}`}
                          className="chip hover:!text-ink"
                        >
                          📓 {notebookTitle(id)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <select
                    className="input text-xs max-w-[120px]"
                    value={g.status}
                    onChange={(e) => update(g.id, { status: e.target.value as Goal['status'] })}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="done">Done</option>
                  </select>
                  <button onClick={() => del(g.id)} className="text-xs text-ink-dim hover:text-bad">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
