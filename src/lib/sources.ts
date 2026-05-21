export interface FetchedSource {
  title: string;
  url?: string;
  content: string;
}

const HTML_BLOCK_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'div', 'section', 'article'];

function stripTags(html: string): string {
  let out = html;
  // remove script + style entirely
  out = out.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  out = out.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  // insert newlines for block tags
  for (const tag of HTML_BLOCK_TAGS) {
    out = out.replace(new RegExp(`<\\s*/?\\s*${tag}\\b[^>]*>`, 'gi'), '\n');
  }
  // strip remaining tags
  out = out.replace(/<[^>]+>/g, ' ');
  // decode the common entities we'll see
  out = out
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // collapse whitespace
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

function extractTitle(html: string, fallback: string): string {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (t) return stripTags(t).slice(0, 200) || fallback;
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) return stripTags(h1).slice(0, 200) || fallback;
  return fallback;
}

export async function fetchUrlAsSource(url: string): Promise<FetchedSource> {
  const u = new URL(url);
  const res = await fetch(u.toString(), {
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; AgentOSNotebook/1.0; +local)',
      accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const ctype = res.headers.get('content-type') || '';
  const raw = await res.text();
  let content: string;
  let title: string;
  if (ctype.includes('html') || /<html[\s>]/i.test(raw)) {
    content = stripTags(raw);
    title = extractTitle(raw, u.hostname + u.pathname);
  } else {
    content = raw.trim();
    title = u.hostname + u.pathname;
  }
  return { title, url: u.toString(), content };
}
