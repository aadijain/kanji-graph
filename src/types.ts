export type EdgeType = "shared-kanji" | "same-reading" | "similar-kanji";

export interface WordEntry {
  reading: string;
  glosses: string[];
  jlpt?: number;
}

export interface WordNode {
  id: string;
  word: string;
  reading: string;
  glosses: string[];
  entries: WordEntry[];
  kanji: string[];
  frequency?: number;
  jlpt?: number;
  // Mutated by force-graph at runtime:
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

// Represents a group of hidden connections via a high-frequency kanji.
// `kanji` is the character present in the subject word (used for hover-dim matching).
// `partnerKanji` is set for similar-kanji entries: the confusable character displayed in the panel.
// `words` lists the word IDs that belong to this side of the connection.
// `perWordCount` is how many hidden connections each word in `words` has via this entry.
export interface HighFreqConnection {
  type: "shared-kanji" | "similar-kanji";
  kanji: string;
  partnerKanji?: string;
  words: string[];
  perWordCount: number;
}

export interface Edge {
  source: string | WordNode;
  target: string | WordNode;
  type: EdgeType;
  via: string[];
}

export interface GraphData {
  nodes: WordNode[];
  edges: Edge[];
  stats: { words: number; edges: number; kanji: number; hiddenEdges?: Partial<Record<string, number>> };
  highFreqConnections?: HighFreqConnection[];
  generatedAt: string;
}

export const edgeId = (e: Edge) => {
  const s = typeof e.source === "string" ? e.source : e.source.id;
  const t = typeof e.target === "string" ? e.target : e.target.id;
  return `${s}__${t}`;
};

export const endpointId = (end: string | WordNode) =>
  typeof end === "string" ? end : end.id;
