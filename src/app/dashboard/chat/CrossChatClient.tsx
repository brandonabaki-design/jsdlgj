'use client';

import { useEffect, useRef, useState } from 'react';
import Markdown from '@/components/Markdown';
import type { Notebook } from '@/lib/types';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function CrossChatClient({ notebooks }: { notebooks: Notebook[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(notebooks.map((n) => n.id)));
  const [useMemory, setUseMemory] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streamed, setStreamed] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamed]);

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function send() {
    if (!input.trim() || busy || selected.size === 0) return;
    const userText = input.trim();
    setInput('');
    setBusy(true);
    setStreamed('');
    setMessages((cur) => [...cur, { id: 'u' + Math.random(), role: 'user', content: userText }]);

    try {
      const res = await fetch('/api/cross-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          notebookIds: [...selected],
          useMemory,
        }),
      });
      if (!res.ok || !res.body) throw new Error('Failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';
        for (const block of lines) {
          if (!block.startsWith('data:')) continue;
          const data = JSON.parse(block.slice(5).trim());
          if (data.delta) {
            acc += data.delta;
            setStreamed(acc);
          } else if (data.error) {
            throw new Error(data.error);
          } else if (data.done) {
            setMessages((cur) => [...cur, { id: 'a' + Math.random(), role: 'assistant', content: acc }]);
            setStreamed('');
          }
        }
      }
    } catch (e: any) {
      setMessages((cur) => [
        ...cur,
        { id: 'e' + Math.random(), role: 'assistant', content: `_Error: ${e?.message ?? 'unknown'}_` },
      ]);
      setStreamed('');
    } finally {
      setBusy(false);
    }
  }

  const totalSources = notebooks
    .filter((n) => selected.has(n.id))
    .reduce((a, n) => a + n.sourceIds.length, 0);

  return (
    <div className="flex h-screen flex-col">
      <header className="px-6 py-4 border-b border-bg-line bg-bg-panel">
        <h1 className="text-lg font-semibold">Cross-notebook chat</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Query across multiple notebooks at once. Each answer cites [Source N] and tells you which notebook it came from.
        </p>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 border-r border-bg-line bg-bg-panel overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="label">Notebooks</span>
            <button
              onClick={() =>
                setSelected(selected.size === notebooks.length ? new Set() : new Set(notebooks.map((n) => n.id)))
              }
              className="text-[11px] text-accent-glow hover:underline"
            >
              {selected.size === notebooks.length ? 'None' : 'All'}
            </button>
          </div>
          <div className="text-[11px] text-ink-dim mb-3">
            {selected.size} selected · {totalSources} sources in context
          </div>
          {notebooks.length === 0 ? (
            <div className="text-xs text-ink-muted">No notebooks yet.</div>
          ) : (
            <ul className="space-y-1">
              {notebooks.map((n) => (
                <li key={n.id}>
                  <label className="flex items-start gap-2 rounded-md p-2 hover:bg-bg-elev cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(n.id)}
                      onChange={() => toggle(n.id)}
                      className="mt-0.5 accent-[#7c5cff]"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium truncate">{n.title}</span>
                      <span className="block text-[10px] text-ink-dim">{n.sourceIds.length} sources</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-4 flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
            <input
              type="checkbox"
              checked={useMemory}
              onChange={(e) => setUseMemory(e.target.checked)}
              className="accent-[#7c5cff]"
            />
            Inject Memory vault
          </label>
        </aside>
        <div className="flex-1 flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {messages.length === 0 && !streamed && (
              <div className="max-w-md mx-auto text-center mt-12">
                <div className="text-3xl mb-3">💬</div>
                <div className="text-sm font-medium">Ask across all your notebooks</div>
                <p className="text-xs text-ink-muted mt-2">
                  Things NotebookLM can't do natively: synthesize across multiple notebooks,
                  find contradictions, surface gaps.
                </p>
              </div>
            )}
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-accent/15 border border-accent/25 px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex">
                  <div className="max-w-[85%] rounded-2xl bg-bg-elev border border-bg-line px-4 py-3 text-sm">
                    <Markdown content={m.content} />
                  </div>
                </div>
              ),
            )}
            {streamed && (
              <div className="flex">
                <div className="max-w-[85%] rounded-2xl bg-bg-elev border border-bg-line px-4 py-3 text-sm">
                  <Markdown content={streamed} />
                  <span className="inline-block w-1.5 h-3.5 bg-accent-glow align-middle ml-0.5 animate-pulse" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-bg-line p-3 bg-bg-panel/60">
            <div className="flex gap-2">
              <textarea
                className="input flex-1 min-h-[48px] max-h-40 resize-none"
                placeholder={
                  selected.size === 0
                    ? 'Select at least one notebook…'
                    : 'Ask across the selected notebooks. Cmd/Ctrl+Enter to send.'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={selected.size === 0}
              />
              <button onClick={send} disabled={busy || !input.trim() || selected.size === 0} className="btn-primary disabled:opacity-50">
                {busy ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
