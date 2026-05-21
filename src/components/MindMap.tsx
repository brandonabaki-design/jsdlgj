'use client';

import { useEffect, useRef, useState } from 'react';

export default function MindMap({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
        const code = extractMermaid(source);
        if (!code) {
          setErr('No mermaid block found in this asset.');
          return;
        }
        const { svg } = await mermaid.render('mm-' + Math.random().toString(36).slice(2), code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (e: any) {
        setErr(e?.message ?? 'Render error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (err) {
    return (
      <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded p-3 font-mono whitespace-pre-wrap">
        {err}
      </div>
    );
  }
  return <div ref={ref} className="w-full overflow-x-auto" />;
}

function extractMermaid(src: string): string | null {
  const m = src.match(/```mermaid\s*\n([\s\S]*?)```/);
  if (m) return m[1].trim();
  if (src.trim().startsWith('mindmap') || src.trim().startsWith('graph')) return src.trim();
  return null;
}
