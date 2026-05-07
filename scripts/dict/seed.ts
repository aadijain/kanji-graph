import type { DictionarySource, WordEntry } from "./source.ts";

const ENTRIES: WordEntry[] = [
  { word: "食べる", reading: "たべる", glosses: ["to eat"], jlpt: 5, frequency: 1 },
  { word: "食事", reading: "しょくじ", glosses: ["meal", "dining"], jlpt: 4, frequency: 2 },
  { word: "朝食", reading: "ちょうしょく", glosses: ["breakfast"], jlpt: 4, frequency: 4 },
  { word: "夕食", reading: "ゆうしょく", glosses: ["dinner", "evening meal"], jlpt: 4, frequency: 4 },
  { word: "食堂", reading: "しょくどう", glosses: ["cafeteria", "dining hall"], jlpt: 4, frequency: 4 },
  { word: "学生", reading: "がくせい", glosses: ["student"], jlpt: 5, frequency: 1 },
  { word: "先生", reading: "せんせい", glosses: ["teacher", "doctor"], jlpt: 5, frequency: 1 },
  { word: "学校", reading: "がっこう", glosses: ["school"], jlpt: 5, frequency: 1 },
  { word: "大学", reading: "だいがく", glosses: ["university", "college"], jlpt: 5, frequency: 1 },
  { word: "高校", reading: "こうこう", glosses: ["high school"], jlpt: 4, frequency: 2 },
  { word: "学ぶ", reading: "まなぶ", glosses: ["to learn", "to study"], jlpt: 3, frequency: 3 },
  { word: "大きい", reading: "おおきい", glosses: ["big", "large"], jlpt: 5, frequency: 1 },
  { word: "大切", reading: "たいせつ", glosses: ["important", "precious"], jlpt: 4, frequency: 2 },
  { word: "日本", reading: "にほん", glosses: ["Japan"], jlpt: 5, frequency: 1 },
  { word: "今日", reading: "きょう", glosses: ["today"], jlpt: 5, frequency: 1 },
  { word: "毎日", reading: "まいにち", glosses: ["every day"], jlpt: 5, frequency: 1 },
  { word: "本日", reading: "ほんじつ", glosses: ["today (formal)"], jlpt: 3, frequency: 3 },
  { word: "時間", reading: "じかん", glosses: ["time", "hour"], jlpt: 5, frequency: 1 },
  { word: "時計", reading: "とけい", glosses: ["clock", "watch"], jlpt: 5, frequency: 2 },
  { word: "一日", reading: "いちにち", glosses: ["one day", "all day"], jlpt: 5, frequency: 2 },
];

const BY_WORD = new Map(ENTRIES.map((e) => [e.word, e]));

export const seedSource: DictionarySource = {
  name: "seed",
  async lookup(word) {
    const entry = BY_WORD.get(word);
    return entry ? [entry] : null;
  },
};
