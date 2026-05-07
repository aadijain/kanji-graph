export interface WordEntry {
  word: string;
  reading: string;
  glosses: string[];
  frequency?: number;
  jlpt?: number;
}

export interface DictionarySource {
  name: string;
  prepare?(): Promise<void>;
  lookup(word: string): Promise<WordEntry[] | null>;
}
