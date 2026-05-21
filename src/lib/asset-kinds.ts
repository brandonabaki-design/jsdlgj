import type { AssetKind } from './types';

export const ASSET_KINDS: { kind: AssetKind; label: string; emoji: string }[] = [
  { kind: 'briefing', label: 'Briefing doc', emoji: '📝' },
  { kind: 'mindmap', label: 'Mind map', emoji: '🧠' },
  { kind: 'flashcards', label: 'Flashcards', emoji: '🃏' },
  { kind: 'faq', label: 'FAQ', emoji: '❓' },
  { kind: 'study-guide', label: 'Study guide', emoji: '📚' },
  { kind: 'podcast-script', label: 'Podcast script', emoji: '🎙️' },
  { kind: 'infographic-spec', label: 'Infographic spec', emoji: '📊' },
  { kind: 'quiz', label: 'Quiz', emoji: '🎯' },
  { kind: 'slide-deck', label: 'Slide deck', emoji: '🖼️' },
];
