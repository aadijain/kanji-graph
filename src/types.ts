export type EdgeType = "shared-kanji";

export interface WordNode {
  id: string;
  word: string;
  reading: string;
  glosses: string[];
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

export interface Edge {
  source: string | WordNode;
  target: string | WordNode;
  type: EdgeType;
  via: string[];
}

export interface GraphData {
  nodes: WordNode[];
  edges: Edge[];
  stats: { words: number; edges: number; kanji: number };
  generatedAt: string;
}

export const edgeId = (e: Edge) => {
  const s = typeof e.source === "string" ? e.source : e.source.id;
  const t = typeof e.target === "string" ? e.target : e.target.id;
  return `${s}__${t}`;
};

export const endpointId = (end: string | WordNode) =>
  typeof end === "string" ? end : end.id;
