# kanji-graph

Interactive web tool for visualizing connections between Japanese words you've learned. Words are linked by shared kanji, identical readings, or visually similar kanji. Personal study/revision aid built as a single-page static site.

---

<!-- screenshots / demo GIFs go here -->

---

## Features

- **Graph view** -- force-directed canvas graph; hover a word to highlight its connections
- **Word view** -- click a word to zoom in, reposition neighbors radially, and see per-kanji detail
- **Search** -- type anywhere to search by kanji, kana reading, or romaji; arrow keys + Enter to jump
- **Three edge types** -- shared kanji, same reading, visually similar kanji
- **Pronunciation audio** -- local [Yomitan audio server](https://github.com/yomidevs/local-audio-yomichan) or browser TTS
- **Clipboard sync** -- copy a word anywhere and the graph focuses it automatically (opt-in)
- **Persistent layout** -- node positions saved to localStorage so that the graph persists between reloads

## Quick start

```bash
npm install
npm run fetch-jitendex  # download Jitendex dictionary (one-time)
npm run build-graph     # generate public/graph.json from data/words.txt
npm run dev             # start dev server
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build-graph` | Read `data/words.txt`, look up each word, write `public/graph.json` |
| `npm run fetch-jitendex` | Download the latest Jitendex Yomitan zip |
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

Tab-separated groups of visually similar / commonly confused kanji, one group per line. All kanji within a group are treated as mutually similar. Order within a group doesn't matter; duplicates are ignored.

```tsv
大	太
日	目
木	本	末	未
```

## Dictionary setup

`build-graph` looks up each word in Jitendex, falling back to a small built-in seed list if the dictionary isn't present.

```bash
npm run fetch-jitendex                              # download to default cache location
npm run fetch-jitendex -- --force                   # re-download even if already present
JITENDEX_PATH=/path/to/jitendex.zip npm run build-graph  # use a custom zip path
```

Jitendex can also be downloaded manually from <https://jitendex.org>.

## Clipboard sync

Enable **Settings > Clipboard > Follow clipboard** to have kanji-graph focus a word automatically when you copy it elsewhere.

Two mechanisms, depending on context:

- **Paste (`Ctrl+V`) while on the graph page** -- works over plain HTTP. Copy a word in Anki or a browser tab, switch to kanji-graph, paste. The graph focuses the word if it exists.
- **Automatic on tab switch** -- requires HTTPS or localhost. When the tab regains focus, kanji-graph reads the clipboard and focuses the word if it changed since the last check.

Words not in the graph are silently ignored in both cases.

Browser clipboard permission is required; support varies by browser.

## Audio playback

Audio has two modes, toggled in **Settings > Audio > Local audio server**:

- **Off (default):** uses the browser's built-in Japanese TTS (`ja-JP`). Requires a Japanese language pack installed on your OS. It is noticeably lower quality than the local audio server.
- **On:** fetches from a local [Yomitan audio server](https://github.com/yomidevs/local-audio-yomichan). The default URL template is `http://127.0.0.1:5050/?term={term}&reading={reading}`. Paste a custom template into the URL field that appears below the toggle.

## Configuration

Key configuration files:

| What | File |
|---|---|
| Port | `vite.config.ts` |
| App constants -- colors, localStorage keys, graph physics, audio defaults | `src/lib/constants.ts` |
| Build pipeline constants -- dictionary paths, data file paths, output path | `scripts/constants.ts` |
| Settings presets -- animation speeds, zoom levels, layout density values | `src/lib/settings.ts` |
| Word list | `data/words.txt` |
| Similar-kanji groups | `data/similar-kanji.tsv` |
| Audio server URL template | Settings > Audio > Local audio server |

## Disclaimers

- *Personal hobby project, may not be actively maintained.*
- *Developed with AI assistance (Claude).*
- *MIT licensed.*