# Agent OS Notebook

A local Claude-powered NotebookLM + agent dashboard. Inspired by the "Goldie infinite knowledge engine" idea from the video — built honestly, since NotebookLM has no public API.

## What it does

- **Notebooks** — containers of sources (URLs, pasted text, markdown). Each notebook is its own knowledge vault.
- **Grounded chat** — talk to a notebook. Every non-trivial claim cites `[Source N]`; clicking the citation opens the source.
- **Studio** — generate from your sources: briefing doc, mind map (Mermaid, rendered in-app), flashcards, FAQ, study guide, podcast script, infographic spec, quiz, slide deck. All cite their sources.
- **Assets gallery** — every generated artifact, browsable across all notebooks, with filter by kind/notebook and download.
- **Cross-notebook chat** — ask one question across multiple notebooks at once. NotebookLM can't do this natively.
- **Goals** — track what you're working on; link goals to relevant notebooks.
- **Memory vault** — long-lived facts about you/your business. Toggle "Use Memory" in any chat to inject this context.
- **Folder ingest** — drop `.md` or `.txt` files in a folder, point the app at it, bulk-import as sources.
- **Export → NotebookLM** — download a `.zip` source pack you can upload to the real NotebookLM if you want both.

## Why not just NotebookLM directly?

NotebookLM has no public API. The video's "MCP integration" is at best browser automation. So this app:

1. Builds the same workflow locally on Claude (real, working, scriptable).
2. Also exports source packs so you can use real NotebookLM when you want its TTS/video features.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Anthropic SDK with **prompt caching** on source blocks (slashes token cost as you iterate)
- Streaming SSE for chat
- JSON file store at `.data/` (no native deps — easy to back up, easy to inspect)
- Mermaid for mind maps

## Run it

```bash
npm install
cp .env.example .env.local
# edit .env.local — paste your ANTHROPIC_API_KEY
npm run dev
# open http://localhost:3000
```

Default model is `claude-sonnet-4-6`. Override with `CLAUDE_MODEL` in `.env.local`.

## Where data lives

Everything is in `.data/` in the project root (override with `DATA_DIR=/some/path`):

```
.data/
  notebooks.json
  sources.json
  messages.json
  assets.json
  goals.json
  memory.json
  assets/        # individual asset files (.md / .json / .mmd)
```

Nothing leaves your machine except API calls to Anthropic.

## A note on the source material

The video that inspired this is largely a sales pitch for a paid community, and several claims are aspirational (no public NotebookLM API, "MCP integration" is hand-wavy). This implementation captures the **good** ideas — a unified knowledge-engine dashboard with grounded chat and asset generation — without the marketing.

What I deliberately added beyond the video:

- Real citations that link back to sources (NotebookLM has this, the video's app doesn't actually).
- Cross-notebook chat (no equivalent in NotebookLM).
- NotebookLM source-pack export (best of both worlds).
- Folder watch / bulk ingest.
- Prompt caching on the sources block.
- Memory injection into any chat.

## Roadmap ideas

- Real TTS for podcast scripts (ElevenLabs / OpenAI TTS adapter).
- PDF parsing for sources.
- Embedding-based retrieval for very large notebooks (currently uses prompt caching + full context — great up to ~150k tokens).
- Per-notebook agent skills (auto-generate roadmaps, daily briefings, etc.).
