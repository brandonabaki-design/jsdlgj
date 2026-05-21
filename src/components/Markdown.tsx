'use client';

import { marked } from 'marked';
import { useMemo } from 'react';

marked.setOptions({ gfm: true, breaks: true });

export default function Markdown({
  content,
  onCitationClick,
}: {
  content: string;
  onCitationClick?: (n: number) => void;
}) {
  const html = useMemo(() => {
    const rendered = marked.parse(content || '') as string;
    return rendered.replace(
      /\[Source\s+(\d+)\]/g,
      (_m, n) => `<span class="citation" data-source="${n}">${n}</span>`,
    );
  }, [content]);

  return (
    <div
      className="prose-mini"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.classList?.contains('citation')) {
          const n = parseInt(t.dataset.source ?? '0', 10);
          if (n) onCitationClick?.(n);
        }
      }}
    />
  );
}
