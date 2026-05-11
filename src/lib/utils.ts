import type { WordNode, WordEntry } from "../types";

// Returns a node's dictionary entries, falling back to a synthetic entry built
// from the node's top-level fields for older graph.json files that predate the
// entries array.
export function getNodeEntries(node: WordNode): WordEntry[] {
  if (node.entries?.length) return node.entries;
  return [{ reading: node.reading, glosses: node.glosses ?? [], jlpt: node.jlpt }];
}
