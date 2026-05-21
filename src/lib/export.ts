import type { Notebook, Source } from './types';

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'untitled';
}

// Tiny zero-dep store-only zip builder (no compression). Good enough for text.
// Format reference: PKWARE APPNOTE — local file header + central directory + EOCD.
export function buildZipForNotebookLM(notebook: Notebook, sources: Source[]): {
  filename: string;
  bytes: Uint8Array;
} {
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];

  // README
  const readme = `# ${notebook.title}

${notebook.description || ''}

## How to use this pack
1. Open https://notebooklm.google.com
2. Create a new notebook
3. Upload every file in the \`sources/\` folder (or paste URLs from \`urls.txt\`)
4. (Optional) paste this README as the notebook description
`;
  files.push({ name: 'README.md', data: enc.encode(readme) });

  // URL list for quick paste
  const urls = sources.filter((s) => s.url).map((s) => s.url!).join('\n');
  if (urls) files.push({ name: 'urls.txt', data: enc.encode(urls + '\n') });

  // Each source as its own file in sources/
  let n = 1;
  for (const s of sources) {
    const base = `${String(n).padStart(2, '0')}_${sanitize(s.title)}`;
    const ext = s.type === 'markdown' ? 'md' : 'txt';
    const header = `Title: ${s.title}\n${s.url ? `URL: ${s.url}\n` : ''}\n`;
    files.push({
      name: `sources/${base}.${ext}`,
      data: enc.encode(header + s.content + '\n'),
    });
    n++;
  }

  return {
    filename: `${sanitize(notebook.title)}-notebooklm-pack.zip`,
    bytes: buildZip(files),
  };
}

// --- Minimal zip builder (store, no compression) ---

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}
function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function dosTime(d = new Date()): { time: Uint8Array; date: Uint8Array } {
  const t =
    ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() / 2) & 0x1f);
  const dt =
    (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time: u16(t), date: u16(dt) };
}

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const { time, date } = dosTime();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const centralOffsets: number[] = [];

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    // Local file header
    const local = concat([
      u32(0x04034b50),
      u16(20), // version
      u16(0), // flags
      u16(0), // method = store
      time,
      date,
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0), // extra
      nameBytes,
      f.data,
    ]);
    centralOffsets.push(offset);
    offset += local.length;
    localParts.push(local);

    // Central directory entry
    const central = concat([
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method
      time,
      date,
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0), // extra len
      u16(0), // comment len
      u16(0), // disk
      u16(0), // internal attrs
      u32(0), // external attrs
      u32(centralOffsets[centralOffsets.length - 1]),
      nameBytes,
    ]);
    centralParts.push(central);
  }

  const centralStart = offset;
  const centralBytes = concat(centralParts);
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBytes.length),
    u32(centralStart),
    u16(0),
  ]);

  return concat([...localParts, centralBytes, eocd]);
}
