import { getClient, DEFAULT_MODEL, buildSourcesContext, type SourceBlock } from './anthropic';
import type { ChatMessage } from './types';

const CHAT_SYSTEM = `You are the assistant for a local Claude-powered NotebookLM ("Agent OS Notebook").
You answer the user's questions about the provided sources, citing [Source N] inline for every non-trivial claim.
Rules:
- Ground every factual statement in the <source> blocks.
- If the answer isn't in the sources, say "The sources don't cover this" and offer what is covered.
- Be direct and concise. Use short paragraphs and lists.
- When the user asks for ideas/opinions, mark them clearly as inference, not from a source.
- If a "Memory" block is provided, it's user context — use it to personalize tone and recommendations, but don't cite it as a source.`;

export async function streamChat(args: {
  sources: SourceBlock[];
  history: ChatMessage[];
  userMessage: string;
  memoryContext?: string;
  signal?: AbortSignal;
}) {
  const client = getClient();
  const sourcesText = buildSourcesContext(args.sources);

  const systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
    { type: 'text', text: CHAT_SYSTEM },
  ];
  if (sourcesText) {
    systemBlocks.push({
      type: 'text',
      text: `<sources>\n${sourcesText}\n</sources>`,
      cache_control: { type: 'ephemeral' },
    });
  }
  if (args.memoryContext) {
    systemBlocks.push({
      type: 'text',
      text: `<memory>\n${args.memoryContext}\n</memory>`,
    });
  }

  const history = args.history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return client.messages.stream(
    {
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: systemBlocks,
      messages: [...history, { role: 'user', content: args.userMessage }],
    },
    { signal: args.signal },
  );
}

export function extractCitations(text: string): number[] {
  const re = /\[Source\s+(\d+)\]/gi;
  const ids = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    ids.add(parseInt(m[1], 10));
  }
  return [...ids].sort((a, b) => a - b);
}
