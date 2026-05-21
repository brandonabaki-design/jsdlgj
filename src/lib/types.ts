export type SourceType = 'url' | 'text' | 'markdown';

export interface Source {
  id: string;
  notebookId: string;
  title: string;
  type: SourceType;
  url?: string;
  content: string;
  tokens?: number;
  tags?: string[];
  addedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: number[];
  createdAt: string;
}

export interface Notebook {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  sourceIds: string[];
  messageIds: string[];
  assetIds: string[];
  pinned?: boolean;
}

export type AssetKind =
  | 'briefing'
  | 'mindmap'
  | 'flashcards'
  | 'faq'
  | 'study-guide'
  | 'podcast-script'
  | 'infographic-spec'
  | 'quiz'
  | 'slide-deck';

export interface Asset {
  id: string;
  notebookId: string;
  kind: AssetKind;
  title: string;
  format: 'md' | 'json' | 'mermaid';
  content: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'done';
  createdAt: string;
  linkedNotebookIds: string[];
}

export interface MemoryNote {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
}
