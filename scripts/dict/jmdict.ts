import type { DictionarySource } from "./source.ts";

// Phase 1.5 — fetches jmdict-simplified release JSON, builds an index, and
// implements lookup. For now this is a stub so the source-pluggable design is
// visible from the start. To enable: implement prepare() to download
// https://github.com/scriptin/jmdict-simplified/releases (jmdict-eng-*.json),
// cache to ~/.cache/kanji-graph, and build a Map<surface, entry>.
export const jmdictSource: DictionarySource = {
  name: "jmdict",
  async prepare() {
    throw new Error("jmdictSource not implemented yet — use seedSource for now");
  },
  async lookup() {
    return null;
  },
};
