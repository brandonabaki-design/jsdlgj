'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from '@/components/Markdown';
import MindMap from '@/components/MindMap';
import { ASSET_KINDS } from '@/lib/asset-kinds';
import type { Asset, ChatMessage, Notebook, Source } from '@/lib/types';

type Tab = 'chat' | 'studio' | 'assets';

export default function NotebookClient({
  initialNotebook,
  initialSources,
  initialMessages,
  initialAssets,
}: {
  initialNotebook: Notebook;
  initialSources: Source[];
  initialMessages: ChatMessage[];
  initialAssets: Asset[];
}) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(initialNotebook);
  const [sources, setSources] = useState(initialSources);
  const [messages, setMessages] = useState(initialMessages);
  const [assets, setAssets] = useState(initialAssets);
  const [tab, setTab] = useState<Tab>('chat');
  const [openSource, setOpenSource] = useState<Source | null>(null);
  const [openAsset, setOpenAsset] = useState<Asset | null>(null);

  const sourcesByIndex = useMemo(() => {
    const map = new Map<number, Source>();
    sources.forEach((s, i) => map.set(i + 1, s));
    return map;
  }, [sources]);

  function onCitation(n: number) {
    const s = sourcesByIndex.get(n);
    if (s) setOpenSource(s);
  }

  async function togglePin() {
    const next = !notebook.pinned;
    setNotebook({ ...notebook, pinned: next });
    await fetch(`/api/notebooks/${notebook.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pinned: next }),
    });
  }

  async function exportPack() {
    window.location.href = `/api/notebooks/${notebook.id}/export`;
  }

  async function deleteNotebook() {
    if (!confirm('Delete this notebook and all its sources/assets?')) return;
    await fetch(`/api/notebooks/${notebook.id}`, { method: 'DELETE' });
    router.push('/dashboard/notebooks');
  }

  const totalTokens = sources.reduce((a, s) => a + (s.tokens ?? 0), 0);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-bg-line bg-bg-panel px-6 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold truncate">{notebook.title}</h1>
            {notebook.pinned && <span className="chip">pinned</span>}
          </div>
          {notebook.description && (
            <p className="text-xs text-ink-muted mt-0.5 truncate">{notebook.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={togglePin} className="btn-ghost text-xs">
            {notebook.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={exportPack} className="btn-ghost text-xs" title="Export as NotebookLM source pack">
            Export → NotebookLM
          </button>
          <button onClick={deleteNotebook} className="btn-danger text-xs">
            Delete
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: sources */}
        <div className="w-80 shrink-0 border-r border-bg-line bg-bg-panel overflow-y-auto">
          <SourcesPanel
            sources={sources}
            totalTokens={totalTokens}
            onAdded={(s) => setSources((cur) => [...cur, s])}
            onRemoved={(id) => setSources((cur) => cur.filter((x) => x.id !== id))}
            onOpen={setOpenSource}
            notebookId={notebook.id}
          />
        </div>

        {/* Middle: tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 border-b border-bg-line px-3 py-2 bg-bg-panel/60">
            <TabButton current={tab} value="chat" onClick={() => setTab('chat')}>
              💬 Chat
            </TabButton>
            <TabButton current={tab} value="studio" onClick={() => setTab('studio')}>
              🎬 Studio
            </TabButton>
            <TabButton current={tab} value="assets" onClick={() => setTab('assets')}>
              🗂 Assets <span className="text-ink-dim ml-1">({assets.length})</span>
            </TabButton>
          </div>

          <div className="flex-1 overflow-hidden">
            {tab === 'chat' && (
              <ChatPanel
                notebookId={notebook.id}
                sourcesCount={sources.length}
                messages={messages}
                setMessages={setMessages}
                onCitation={onCitation}
              />
            )}
            {tab === 'studio' && (
              <StudioPanel
                notebookId={notebook.id}
                hasSources={sources.length > 0}
                onAsset={(a) => {
                  setAssets((cur) => [a, ...cur]);
                  setOpenAsset(a);
                }}
              />
            )}
            {tab === 'assets' && (
              <AssetsPanel
                assets={assets}
                onOpen={setOpenAsset}
                onDelete={(id) => setAssets((cur) => cur.filter((a) => a.id !== id))}
              />
            )}
          </div>
        </div>
      </div>

      {openSource && (
        <Drawer title={openSource.title} onClose={() => setOpenSource(null)}>
          {openSource.url && (
            <div className="text-xs text-ink-muted mb-3 truncate">
              <a href={openSource.url} target="_blank" rel="noreferrer" className="text-accent-glow underline">
                {openSource.url}
              </a>
            </div>
          )}
          <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words text-ink">
            {openSource.content}
          </pre>
        </Drawer>
      )}

      {openAsset && (
        <Drawer title={openAsset.title} onClose={() => setOpenAsset(null)}>
          <AssetView asset={openAsset} onCitation={onCitation} />
        </Drawer>
      )}
    </div>
  );
}

function TabButton({
  current,
  value,
  onClick,
  children,
}: {
  current: Tab;
  value: Tab;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active ? 'bg-bg-elev text-ink' : 'text-ink-muted hover:bg-bg-elev hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function SourcesPanel({
  sources,
  totalTokens,
  onAdded,
  onRemoved,
  onOpen,
  notebookId,
}: {
  sources: Source[];
  totalTokens: number;
  onAdded: (s: Source) => void;
  onRemoved: (id: string) => void;
  onOpen: (s: Source) => void;
  notebookId: string;
}) {
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body =
        mode === 'url'
          ? { type: 'url', url }
          : { type: 'text', title: title || 'Untitled', content: text };
      const res = await fetch(`/api/notebooks/${notebookId}/sources`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || 'Failed');
      onAdded(data.source);
      setUrl('');
      setTitle('');
      setText('');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to add source');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this source?')) return;
    await fetch(`/api/notebooks/${notebookId}/sources?sourceId=${id}`, { method: 'DELETE' });
    onRemoved(id);
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="label">Sources</span>
          <span className="text-[11px] text-ink-dim">
            {sources.length} · ~{Math.round(totalTokens / 1000)}k tok
          </span>
        </div>
        {sources.length === 0 ? (
          <div className="text-xs text-ink-muted bg-bg-elev rounded-md p-3 border border-bg-line">
            Add a URL or paste text below. Sources ground all chat and generations.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {sources.map((s, i) => (
              <li
                key={s.id}
                className="group flex items-start gap-2 rounded-md bg-bg-elev hover:bg-bg-line px-2.5 py-2 border border-transparent hover:border-bg-line"
              >
                <span className="text-[10px] font-semibold text-accent-glow shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <button
                  onClick={() => onOpen(s)}
                  className="text-left flex-1 min-w-0"
                >
                  <div className="text-xs font-medium truncate">{s.title}</div>
                  {s.url && (
                    <div className="text-[10px] text-ink-dim truncate">{s.url}</div>
                  )}
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="text-ink-dim hover:text-bad text-xs opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={add} className="space-y-2 border-t border-bg-line pt-4">
        <div className="flex gap-1 rounded-md bg-bg-elev p-1">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 rounded px-2 py-1 text-xs ${mode === 'url' ? 'bg-bg-base' : 'text-ink-muted'}`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 rounded px-2 py-1 text-xs ${mode === 'text' ? 'bg-bg-base' : 'text-ink-muted'}`}
          >
            Text
          </button>
        </div>
        {mode === 'url' ? (
          <input
            className="input text-xs"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        ) : (
          <>
            <input
              className="input text-xs"
              placeholder="Source title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="input text-xs min-h-[100px]"
              placeholder="Paste article, transcript, notes…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </>
        )}
        {err && <div className="text-xs text-bad">{err}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full text-xs disabled:opacity-50">
          {busy ? 'Adding…' : 'Add source'}
        </button>
      </form>
    </div>
  );
}

function ChatPanel({
  notebookId,
  sourcesCount,
  messages,
  setMessages,
  onCitation,
}: {
  notebookId: string;
  sourcesCount: number;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onCitation: (n: number) => void;
}) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamed, setStreamed] = useState('');
  const [useMemory, setUseMemory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamed]);

  async function send() {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setInput('');
    setStreaming(true);
    setStreamed('');
    const optimistic: ChatMessage = {
      id: 'tmp-' + Math.random(),
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((cur) => [...cur, optimistic]);

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: userText, useMemory }),
      });
      if (!res.ok || !res.body) throw new Error('Chat request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let accumulated = '';
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
            accumulated += data.delta;
            setStreamed(accumulated);
          } else if (data.error) {
            throw new Error(data.error);
          } else if (data.done) {
            const final: ChatMessage = {
              id: data.messageId ?? 'res-' + Math.random(),
              role: 'assistant',
              content: accumulated,
              citations: data.citations,
              createdAt: new Date().toISOString(),
            };
            setMessages((cur) => [...cur, final]);
            setStreamed('');
          }
        }
      }
    } catch (e: any) {
      setMessages((cur) => [
        ...cur,
        {
          id: 'err-' + Math.random(),
          role: 'assistant',
          content: `_Error: ${e?.message ?? 'unknown'}_`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamed('');
    } finally {
      setStreaming(false);
    }
  }

  async function clearAll() {
    if (!confirm('Clear all chat history for this notebook?')) return;
    await fetch(`/api/notebooks/${notebookId}/chat`, { method: 'DELETE' });
    setMessages([]);
  }

  const empty = messages.length === 0 && !streamed;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {empty && (
          <div className="max-w-md mx-auto text-center mt-12">
            <div className="text-3xl mb-3">💬</div>
            <div className="text-sm font-medium">Chat with this notebook</div>
            <p className="text-xs text-ink-muted mt-2">
              {sourcesCount === 0
                ? 'Add at least one source on the left, then ask a question. Every claim will cite [Source N].'
                : 'Ask anything about your sources. Answers cite [Source N] — click them to open the source.'}
            </p>
            {sourcesCount > 0 && (
              <div className="mt-4 grid gap-1.5 text-left">
                {[
                  'Summarize the key insights across all sources.',
                  'What do the sources disagree about?',
                  'Give me 5 sharpest takeaways with citations.',
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="text-xs text-ink-muted hover:text-ink rounded-md border border-bg-line bg-bg-elev px-3 py-2 text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onCitation={onCitation} />
        ))}
        {streamed && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamed,
              createdAt: new Date().toISOString(),
            }}
            onCitation={onCitation}
            streaming
          />
        )}
      </div>
      <div className="border-t border-bg-line p-3 bg-bg-panel/60 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useMemory}
              onChange={(e) => setUseMemory(e.target.checked)}
              className="accent-[#7c5cff]"
            />
            Use Memory vault
          </label>
          <button onClick={clearAll} className="hover:text-ink">Clear history</button>
        </div>
        <div className="flex gap-2">
          <textarea
            className="input flex-1 min-h-[48px] max-h-40 resize-none"
            placeholder={
              sourcesCount === 0
                ? 'Add a source first…'
                : 'Ask anything about your sources. Cmd/Ctrl+Enter to send.'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void send();
              }
            }}
            disabled={sourcesCount === 0}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim() || sourcesCount === 0}
            className="btn-primary disabled:opacity-50"
          >
            {streaming ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCitation,
  streaming,
}: {
  message: ChatMessage;
  onCitation: (n: number) => void;
  streaming?: boolean;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-accent/15 border border-accent/25 px-4 py-2.5 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex">
      <div className="max-w-[85%] rounded-2xl bg-bg-elev border border-bg-line px-4 py-3 text-sm">
        <Markdown content={message.content} onCitationClick={onCitation} />
        {streaming && <span className="inline-block w-1.5 h-3.5 bg-accent-glow align-middle ml-0.5 animate-pulse" />}
      </div>
    </div>
  );
}

function StudioPanel({
  notebookId,
  hasSources,
  onAsset,
}: {
  notebookId: string;
  hasSources: boolean;
  onAsset: (a: Asset) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extra, setExtra] = useState('');

  async function generate(kind: string) {
    if (busy || !hasSources) return;
    setBusy(kind);
    setErr(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, extraInstructions: extra || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onAsset(data.asset);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-1">Studio</h2>
        <p className="text-sm text-ink-muted mb-5">
          Generate grounded content from your sources. Every output cites [Source N].
        </p>

        {!hasSources && (
          <div className="card p-4 mb-5 text-sm text-warn border-warn/30 bg-warn/10">
            Add at least one source to enable generation.
          </div>
        )}

        <div className="card p-4 mb-5">
          <div className="label mb-2">Extra instructions (optional)</div>
          <textarea
            className="input min-h-[60px] text-xs"
            placeholder="e.g. Audience is product managers, focus on the security implications, keep it under 600 words."
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        </div>

        {err && (
          <div className="text-sm text-bad bg-bad/10 border border-bad/30 rounded p-3 mb-4">{err}</div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {ASSET_KINDS.map((k) => (
            <button
              key={k.kind}
              onClick={() => generate(k.kind)}
              disabled={!hasSources || busy !== null}
              className="card p-4 text-left hover:border-accent/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-2xl mb-2">{k.emoji}</div>
              <div className="text-sm font-medium">{k.label}</div>
              <div className="text-[11px] text-ink-muted mt-1">
                {busy === k.kind ? 'Generating…' : 'Click to generate'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetsPanel({
  assets,
  onOpen,
  onDelete,
}: {
  assets: Asset[];
  onOpen: (a: Asset) => void;
  onDelete: (id: string) => void;
}) {
  if (assets.length === 0) {
    return (
      <div className="h-full grid place-items-center px-6">
        <div className="text-center text-sm text-ink-muted">
          No assets yet. Use the Studio tab to generate some.
        </div>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto p-6">
      <ul className="grid grid-cols-2 gap-3">
        {assets.map((a) => (
          <li key={a.id} className="card p-4 hover:border-accent/40 transition">
            <button onClick={() => onOpen(a)} className="text-left w-full">
              <div className="text-sm font-medium truncate">{a.title}</div>
              <div className="text-[11px] text-ink-muted mt-1">
                {a.kind} · {a.format} · {new Date(a.createdAt).toLocaleString()}
              </div>
              <pre className="mt-3 text-[10px] text-ink-dim line-clamp-3 whitespace-pre-wrap">
                {a.content.slice(0, 220)}
              </pre>
            </button>
            <div className="mt-3 flex items-center justify-between text-xs">
              <a
                href={`/api/assets/${a.id}?download=1`}
                className="text-accent-glow hover:underline"
              >
                Download
              </a>
              <button
                onClick={async () => {
                  if (!confirm('Delete asset?')) return;
                  await fetch(`/api/assets/${a.id}`, { method: 'DELETE' });
                  onDelete(a.id);
                }}
                className="text-ink-dim hover:text-bad"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssetView({ asset, onCitation }: { asset: Asset; onCitation: (n: number) => void }) {
  if (asset.kind === 'mindmap' || asset.format === 'mermaid') {
    return (
      <div className="space-y-4">
        <MindMap source={asset.content} />
        <details className="text-xs">
          <summary className="cursor-pointer text-ink-muted">View source</summary>
          <pre className="mt-2 text-[11px] whitespace-pre-wrap bg-bg-base border border-bg-line rounded p-3">
            {asset.content}
          </pre>
        </details>
      </div>
    );
  }
  if (asset.format === 'json') {
    return (
      <pre className="text-xs whitespace-pre-wrap bg-bg-base border border-bg-line rounded p-3">
        {tryFormatJson(asset.content)}
      </pre>
    );
  }
  return <Markdown content={asset.content} onCitationClick={onCitation} />;
}

function tryFormatJson(s: string): string {
  try {
    const v = JSON.parse(s);
    return JSON.stringify(v, null, 2);
  } catch {
    return s;
  }
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
        className="relative w-full max-w-2xl h-full bg-bg-panel border-l border-bg-line shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-bg-panel border-b border-bg-line px-5 py-3">
          <div className="font-medium text-sm truncate">{title}</div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-sm">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
