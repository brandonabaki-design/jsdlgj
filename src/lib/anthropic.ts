import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to .env.local — see .env.example.',
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export function approxTokens(text: string): number {
  // Rough heuristic: ~4 chars per token for English text.
  return Math.ceil(text.length / 4);
}

export interface SourceBlock {
  index: number;
  title: string;
  url?: string;
  content: string;
}

export function buildSourcesContext(sources: SourceBlock[]): string {
  if (!sources.length) return '';
  return sources
    .map(
      (s) =>
        `<source id="${s.index}" title=${JSON.stringify(s.title)}${
          s.url ? ` url=${JSON.stringify(s.url)}` : ''
        }>\n${s.content}\n</source>`,
    )
    .join('\n\n');
}
