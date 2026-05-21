import { getClient, DEFAULT_MODEL, buildSourcesContext, type SourceBlock } from './anthropic';
import type { AssetKind } from './types';
import { ASSET_KINDS } from './asset-kinds';

export { ASSET_KINDS };

interface GenSpec {
  systemSuffix: string;
  task: string;
  format: 'md' | 'json' | 'mermaid';
}

const SPECS: Record<AssetKind, GenSpec> = {
  briefing: {
    systemSuffix: 'You produce concise, executive-quality briefing documents.',
    format: 'md',
    task: `Produce a BRIEFING DOCUMENT in Markdown with these sections:
# Briefing: <topic>
## TL;DR
3-5 bullets, the punchiest insights.
## Key findings
Numbered list of the most important findings. Cite sources inline as [Source N].
## Tensions & contradictions
Where the sources disagree or have gaps.
## Implications
What this means for a decision-maker.
## Open questions
Things the sources don't answer.

Cite EVERY non-trivial claim with [Source N]. Be specific, not generic.`,
  },
  mindmap: {
    systemSuffix: 'You produce valid Mermaid mindmap syntax.',
    format: 'mermaid',
    task: `Produce a Mermaid mindmap of the key concepts in the sources.
Start with EXACTLY this line: \`\`\`mermaid
Then: mindmap
Then nodes with proper indentation. Use 4-6 top-level branches, 3-7 sub-nodes each.
Keep node labels short (1-5 words). Close with \`\`\`.
Output ONLY the mermaid code block, nothing else.`,
  },
  flashcards: {
    systemSuffix: 'You produce study flashcards as JSON.',
    format: 'json',
    task: `Produce 12-20 flashcards as a JSON array. Each item:
{ "q": "question", "a": "answer (1-3 sentences)", "source": N }
Source N is the [Source N] index it came from. Mix difficulties.
Output ONLY the JSON array, nothing else.`,
  },
  faq: {
    systemSuffix: 'You produce comprehensive FAQ documents.',
    format: 'md',
    task: `Produce an FAQ in Markdown with 8-15 Q/A pairs:
# FAQ: <topic>
### Q: ...
A: ... [Source N]

Cover the most likely questions a newcomer would ask. Cite sources.`,
  },
  'study-guide': {
    systemSuffix: 'You produce structured study guides.',
    format: 'md',
    task: `Produce a STUDY GUIDE in Markdown:
# Study guide: <topic>
## Learning objectives (5-7 bullets)
## Core concepts
For each concept (5-10 of them):
### <concept>
- Definition
- Why it matters
- Example
- [Source N]
## Self-check
8-10 short questions (answers in a collapsible block at the bottom).
## Further reading
Bullet links to source URLs if available.`,
  },
  'podcast-script': {
    systemSuffix: 'You produce conversational two-host podcast scripts.',
    format: 'md',
    task: `Produce a 2-host PODCAST SCRIPT (Host A = Alex, Host B = Sam) ~1500 words covering the sources.
Format:
# Podcast: <topic>
**Alex:** ...
**Sam:** ...

Make it lively, curious, occasionally funny. Cite [Source N] in stage directions where a host references a specific source. Open with a hook, end with a takeaway.`,
  },
  'infographic-spec': {
    systemSuffix: 'You produce infographic design specs (text-only).',
    format: 'md',
    task: `Produce an INFOGRAPHIC SPEC in Markdown that a designer could execute:
# Infographic: <title>
## Audience
## Hero stat / headline
## 4-6 sections
For each: heading, 1-line copy, visual treatment (icon/chart/illustration suggestion), data points with [Source N].
## Color & type direction
## Call to action`,
  },
  quiz: {
    systemSuffix: 'You produce multiple-choice quizzes as JSON.',
    format: 'json',
    task: `Produce a quiz of 10 multiple-choice questions as a JSON array:
{ "question": "...", "choices": ["A","B","C","D"], "answer": 0, "explanation": "...", "source": N }
"answer" is the 0-based index of the correct choice.
Output ONLY the JSON array.`,
  },
  'slide-deck': {
    systemSuffix: 'You produce slide deck outlines in Markdown.',
    format: 'md',
    task: `Produce a SLIDE DECK OUTLINE in Markdown (10-14 slides):
# Deck: <title>
---
## Slide 1 — <title>
- bullet
- bullet
Speaker notes: ...
---
(repeat)

Cite sources in speaker notes as [Source N]. Open with hook, close with action.`,
  },
};

const BASE_SYSTEM = `You are the generation engine for a local Claude-powered NotebookLM.
You ALWAYS ground output in the provided <source> blocks. When you make a factual claim, cite it as [Source N] using the numeric id of the source.
If the sources don't contain the answer, say so plainly rather than inventing.`;

export async function generateAsset(args: {
  kind: AssetKind;
  sources: SourceBlock[];
  notebookTitle: string;
  notebookDescription?: string;
  extraInstructions?: string;
}): Promise<{ title: string; content: string; format: 'md' | 'json' | 'mermaid' }> {
  const spec = SPECS[args.kind];
  const client = getClient();

  const sourcesText = buildSourcesContext(args.sources);
  const userMessage = `Notebook: ${args.notebookTitle}
${args.notebookDescription ? `Description: ${args.notebookDescription}\n` : ''}
Task: ${spec.task}
${args.extraInstructions ? `\nExtra instructions: ${args.extraInstructions}` : ''}

Sources:
${sourcesText || '(no sources — say so and stop)'}`;

  const res = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: [
      { type: 'text', text: BASE_SYSTEM, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: spec.systemSuffix },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();

  const title = deriveTitle(args.kind, args.notebookTitle);
  return { title, content, format: spec.format };
}

function deriveTitle(kind: AssetKind, notebook: string): string {
  const k = ASSET_KINDS.find((x) => x.kind === kind);
  return `${k?.emoji ?? ''} ${k?.label ?? kind} — ${notebook}`.trim();
}
