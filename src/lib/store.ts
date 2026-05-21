import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Asset,
  ChatMessage,
  Goal,
  MemoryNote,
  Notebook,
  Source,
} from './types';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), '.data');

const COLLECTIONS = {
  notebooks: 'notebooks.json',
  sources: 'sources.json',
  messages: 'messages.json',
  assets: 'assets.json',
  goals: 'goals.json',
  memory: 'memory.json',
} as const;

type Collection = keyof typeof COLLECTIONS;

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'assets'), { recursive: true });
}

function file(c: Collection) {
  ensureDir();
  return path.join(DATA_DIR, COLLECTIONS[c]);
}

function readAll<T>(c: Collection): T[] {
  const f = file(c);
  if (!fs.existsSync(f)) return [];
  try {
    const raw = fs.readFileSync(f, 'utf8');
    return raw.trim() ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeAll<T>(c: Collection, items: T[]) {
  const f = file(c);
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, f);
}

export function id(prefix = ''): string {
  const r = crypto.randomBytes(8).toString('hex');
  return prefix ? `${prefix}_${r}` : r;
}

export function now() {
  return new Date().toISOString();
}

// ---------- Notebooks ----------
export function listNotebooks(): Notebook[] {
  return readAll<Notebook>('notebooks').sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getNotebook(notebookId: string): Notebook | null {
  return readAll<Notebook>('notebooks').find((n) => n.id === notebookId) ?? null;
}

export function createNotebook(input: { title: string; description?: string }): Notebook {
  const n: Notebook = {
    id: id('nb'),
    title: input.title.trim() || 'Untitled notebook',
    description: input.description?.trim() ?? '',
    createdAt: now(),
    updatedAt: now(),
    sourceIds: [],
    messageIds: [],
    assetIds: [],
  };
  const all = readAll<Notebook>('notebooks');
  all.push(n);
  writeAll('notebooks', all);
  return n;
}

export function updateNotebook(notebookId: string, patch: Partial<Notebook>): Notebook | null {
  const all = readAll<Notebook>('notebooks');
  const i = all.findIndex((n) => n.id === notebookId);
  if (i === -1) return null;
  all[i] = { ...all[i], ...patch, id: all[i].id, updatedAt: now() };
  writeAll('notebooks', all);
  return all[i];
}

export function deleteNotebook(notebookId: string) {
  writeAll('notebooks', readAll<Notebook>('notebooks').filter((n) => n.id !== notebookId));
  writeAll('sources', readAll<Source>('sources').filter((s) => s.notebookId !== notebookId));
  writeAll('messages', readAll<ChatMessage & { notebookId: string }>('messages').filter((m) => m.notebookId !== notebookId));
  const remainingAssets = readAll<Asset>('assets').filter((a) => a.notebookId !== notebookId);
  writeAll('assets', remainingAssets);
}

// ---------- Sources ----------
export function listSources(notebookId: string): Source[] {
  return readAll<Source>('sources')
    .filter((s) => s.notebookId === notebookId)
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

export function addSource(source: Omit<Source, 'id' | 'addedAt'>): Source {
  const s: Source = { ...source, id: id('src'), addedAt: now() };
  const all = readAll<Source>('sources');
  all.push(s);
  writeAll('sources', all);
  const nb = getNotebook(source.notebookId);
  if (nb) updateNotebook(nb.id, { sourceIds: [...nb.sourceIds, s.id] });
  return s;
}

export function deleteSource(sourceId: string) {
  const all = readAll<Source>('sources');
  const s = all.find((x) => x.id === sourceId);
  writeAll('sources', all.filter((x) => x.id !== sourceId));
  if (s) {
    const nb = getNotebook(s.notebookId);
    if (nb) updateNotebook(nb.id, { sourceIds: nb.sourceIds.filter((id) => id !== sourceId) });
  }
}

// ---------- Messages ----------
type StoredMessage = ChatMessage & { notebookId: string };

export function listMessages(notebookId: string): ChatMessage[] {
  return readAll<StoredMessage>('messages')
    .filter((m) => m.notebookId === notebookId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function addMessage(notebookId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  const m: StoredMessage = {
    ...msg,
    notebookId,
    id: id('msg'),
    createdAt: now(),
  };
  const all = readAll<StoredMessage>('messages');
  all.push(m);
  writeAll('messages', all);
  const nb = getNotebook(notebookId);
  if (nb) updateNotebook(nb.id, { messageIds: [...nb.messageIds, m.id] });
  return { ...m };
}

export function clearMessages(notebookId: string) {
  writeAll('messages', readAll<StoredMessage>('messages').filter((m) => m.notebookId !== notebookId));
  const nb = getNotebook(notebookId);
  if (nb) updateNotebook(nb.id, { messageIds: [] });
}

// ---------- Assets ----------
export function listAssets(notebookId?: string): Asset[] {
  const all = readAll<Asset>('assets');
  const scoped = notebookId ? all.filter((a) => a.notebookId === notebookId) : all;
  return scoped.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAsset(assetId: string): Asset | null {
  return readAll<Asset>('assets').find((a) => a.id === assetId) ?? null;
}

export function addAsset(asset: Omit<Asset, 'id' | 'createdAt'>): Asset {
  const a: Asset = { ...asset, id: id('ast'), createdAt: now() };
  const all = readAll<Asset>('assets');
  all.push(a);
  writeAll('assets', all);
  const ext = a.format === 'json' ? 'json' : a.format === 'mermaid' ? 'mmd' : 'md';
  fs.writeFileSync(path.join(DATA_DIR, 'assets', `${a.id}.${ext}`), a.content, 'utf8');
  const nb = getNotebook(asset.notebookId);
  if (nb) updateNotebook(nb.id, { assetIds: [...nb.assetIds, a.id] });
  return a;
}

export function deleteAsset(assetId: string) {
  const all = readAll<Asset>('assets');
  const a = all.find((x) => x.id === assetId);
  writeAll('assets', all.filter((x) => x.id !== assetId));
  if (a) {
    const ext = a.format === 'json' ? 'json' : a.format === 'mermaid' ? 'mmd' : 'md';
    const p = path.join(DATA_DIR, 'assets', `${a.id}.${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    const nb = getNotebook(a.notebookId);
    if (nb) updateNotebook(nb.id, { assetIds: nb.assetIds.filter((id) => id !== assetId) });
  }
}

// ---------- Goals ----------
export function listGoals(): Goal[] {
  return readAll<Goal>('goals').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function upsertGoal(input: Partial<Goal> & { title: string }): Goal {
  const all = readAll<Goal>('goals');
  if (input.id) {
    const i = all.findIndex((g) => g.id === input.id);
    if (i !== -1) {
      all[i] = { ...all[i], ...input } as Goal;
      writeAll('goals', all);
      return all[i];
    }
  }
  const g: Goal = {
    id: id('goal'),
    title: input.title,
    description: input.description ?? '',
    status: (input.status as Goal['status']) ?? 'active',
    createdAt: now(),
    linkedNotebookIds: input.linkedNotebookIds ?? [],
  };
  all.push(g);
  writeAll('goals', all);
  return g;
}

export function deleteGoal(goalId: string) {
  writeAll('goals', readAll<Goal>('goals').filter((g) => g.id !== goalId));
}

// ---------- Memory ----------
export function listMemory(): MemoryNote[] {
  return readAll<MemoryNote>('memory').sort((a, b) => a.title.localeCompare(b.title));
}

export function upsertMemory(input: Partial<MemoryNote> & { title: string; content: string; category: string }): MemoryNote {
  const all = readAll<MemoryNote>('memory');
  if (input.id) {
    const i = all.findIndex((m) => m.id === input.id);
    if (i !== -1) {
      all[i] = { ...all[i], ...input, updatedAt: now() } as MemoryNote;
      writeAll('memory', all);
      return all[i];
    }
  }
  const m: MemoryNote = {
    id: id('mem'),
    title: input.title,
    category: input.category,
    content: input.content,
    updatedAt: now(),
  };
  all.push(m);
  writeAll('memory', all);
  return m;
}

export function deleteMemory(memoryId: string) {
  writeAll('memory', readAll<MemoryNote>('memory').filter((m) => m.id !== memoryId));
}

export const paths = {
  dataDir: DATA_DIR,
  assets: path.join(DATA_DIR, 'assets'),
};
