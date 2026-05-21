import Link from 'next/link';
import { listAssets, listGoals, listMemory, listNotebooks } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function Overview() {
  const notebooks = listNotebooks();
  const assets = listAssets();
  const goals = listGoals().filter((g) => g.status === 'active');
  const memory = listMemory();

  const recentAssets = assets.slice(0, 6);
  const pinned = notebooks.filter((n) => n.pinned).slice(0, 4);
  const recent = notebooks.slice(0, 6);

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Mission control</h1>
        <p className="text-sm text-ink-muted mt-1">
          The control room for your knowledge engine — notebooks in, assets out.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-3 mb-8">
        <Stat label="Notebooks" value={notebooks.length} href="/dashboard/notebooks" />
        <Stat label="Assets generated" value={assets.length} href="/dashboard/assets" />
        <Stat label="Active goals" value={goals.length} href="/dashboard/goals" />
        <Stat label="Memory notes" value={memory.length} href="/dashboard/memory" />
      </section>

      <section className="grid grid-cols-2 gap-6">
        <Panel title="Recent notebooks" action={{ href: '/dashboard/notebooks', label: 'View all →' }}>
          {recent.length === 0 ? (
            <Empty
              title="No notebooks yet"
              body="Create your first notebook, add a few URLs or pasted articles, and start chatting."
              cta={{ href: '/dashboard/notebooks', label: 'Create notebook' }}
            />
          ) : (
            <ul className="divide-y divide-bg-line">
              {recent.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/dashboard/notebooks/${n.id}`}
                    className="flex items-center justify-between py-3 hover:bg-bg-elev px-3 -mx-3 rounded-md"
                  >
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {n.sourceIds.length} sources · {n.assetIds.length} assets
                      </div>
                    </div>
                    <span className="text-ink-dim text-xs">
                      {new Date(n.updatedAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent assets" action={{ href: '/dashboard/assets', label: 'View all →' }}>
          {recentAssets.length === 0 ? (
            <Empty
              title="No assets yet"
              body="Open a notebook and use Studio to generate a briefing, mind map, podcast script, and more."
            />
          ) : (
            <ul className="divide-y divide-bg-line">
              {recentAssets.map((a) => (
                <li key={a.id} className="py-3 px-3 -mx-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {a.kind} · {a.format}
                    </div>
                  </div>
                  <span className="text-ink-dim text-xs shrink-0 ml-3">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {pinned.length > 0 && (
          <Panel title="Pinned">
            <ul className="space-y-2">
              {pinned.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/dashboard/notebooks/${n.id}`}
                    className="flex items-center justify-between rounded-md bg-bg-elev px-3 py-2 hover:bg-bg-line"
                  >
                    <span className="text-sm">{n.title}</span>
                    <span className="text-xs text-ink-muted">{n.sourceIds.length} sources</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="What this is">
          <div className="text-sm text-ink-muted leading-relaxed space-y-2">
            <p>
              A local Claude-powered NotebookLM. Feed it URLs, pasted articles, or markdown.
              Chat with grounded citations. Generate briefings, mind maps, flashcards, podcast scripts.
            </p>
            <p>
              NotebookLM itself has no public API, so this app builds the same workflow on Claude.
              You can also export a notebook as a source pack and upload it to real NotebookLM.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="card p-4 hover:border-accent/40 transition flex flex-col gap-1"
    >
      <span className="label">{label}</span>
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
    </Link>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs text-accent-glow hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="text-center py-8">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">{body}</div>
      {cta && (
        <Link href={cta.href} className="btn-primary mt-4">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
