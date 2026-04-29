# kanji-graph

Interactive web tool for visualizing connections between Japanese words you've learned. Words are linked by shared kanji, identical readings, or visually similar kanji. Personal study/revision aid built as a single-page static site.

## Quick start

```bash
npm install
npm run fetch-jitendex  # download Jitendex dictionary (one-time)
npm run build-graph     # generate public/graph.json from data/words.txt
npm run dev             # dev server at http://localhost:5173
```

`fetch-jitendex` is a one-time step -- it skips the download if the file already exists. Without it, `build-graph` falls back to a 20-word seed list (fine for testing). See [Dictionary setup](#dictionary-setup) for details.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:5173` |
| `npm run build-graph` | Read `data/words.txt`, look up each word, write `public/graph.json` |
| `npm run fetch-jitendex` | Download the latest Jitendex Yomitan zip to `~/.cache/kanji-graph/jitendex.zip` |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

Run `build-graph` whenever you edit `data/words.txt` or `data/similar-kanji.tsv`. `public/graph.json` is a build artifact and is gitignored.

## Data files

### `data/words.txt`

One Japanese word per line. Lines starting with `#` and blank lines are ignored.

```
人
丁寧
日本語
```

### `data/similar-kanji.tsv`

Pairs of visually similar / commonly confused kanji, one pair per tab-separated line. Order within a pair doesn't matter; duplicates are silently ignored. Lines starting with `#` and blank lines are ignored.

```tsv
大	太
日	目
本	木
```

A pair only produces edges in the graph when both kanji appear (in different words) in your word list -- unused pairs are harmless.

## Dictionary setup

`build-graph` looks up each word via a chain of dictionary sources: **Jitendex -> seed fallback**.

### Jitendex (recommended)

Jitendex is a Yomitan-format dictionary based on JMdict.

```bash
npm run fetch-jitendex      # downloads to ~/.cache/kanji-graph/jitendex.zip
npm run fetch-jitendex -- --force  # re-download even if the file exists
```

Or download manually from <https://jitendex.org> and place the zip at `~/.cache/kanji-graph/jitendex.zip`.

To use a custom path:

```bash
JITENDEX_PATH=/path/to/jitendex.zip npm run build-graph
```

If the file is absent, `build-graph` logs a warning and falls back to the 20-word seed dictionary.

### What gets extracted

- Readings (hiragana)
- English glosses (filtered to definitions; examples and attribution lines are dropped)
- JLPT level (from Jitendex term tags, when present)

## Audio playback

The app plays word pronunciation audio via a local Yomitan audio server. By default it expects the server at `http://localhost:5050` (proxied through Vite at `/audio`).

To use a different host or port, create `.env.local` in the project root:

```env
VITE_AUDIO_BASE=http://localhost:5050
```

If the audio server is unreachable the app falls back to the browser's `speechSynthesis` API (`ja-JP` voice).

The Vite proxy (`/audio -> http://localhost:5050`) assumes the audio server runs on the **same machine as the dev server**, not the browser's machine. If your topology differs, adjust the `proxy` target in `vite.config.ts`.

## Non-UI configuration

| Variable | Default | Description |
|---|---|---|
| `JITENDEX_PATH` | `~/.cache/kanji-graph/jitendex.zip` | Path to Jitendex Yomitan zip (build-time) |
| `VITE_AUDIO_BASE` | *(proxy via `/audio`)* | Audio server base URL (runtime, set in `.env.local`) |

Layout positions are cached in `localStorage` under the key `kanji-graph:layout:v1`. Clear this key in DevTools to force a full re-layout.

Settings (edge type toggles, animation speed, focus zoom, etc.) are stored in `localStorage` under `kanji-graph:settings:v2`.

## Disclaimers

- *Personal hobby project, may not be actively maintained.*
- *Developed with AI assistance (Claude).*
- *MIT licensed.*