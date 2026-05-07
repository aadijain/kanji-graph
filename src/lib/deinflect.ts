// [inflected-suffix, dictionary-suffixes[]]
// All rules are applied independently; ambiguous endings produce multiple candidates
// which the caller filters against an actual word list.
const RULES: [string, string[]][] = [
  // ます (polite present/future)
  ["きます", ["く"]],
  ["ぎます", ["ぐ"]],
  ["します", ["す", "する"]],
  ["ちます", ["つ"]],
  ["にます", ["ぬ"]],
  ["びます", ["ぶ"]],
  ["みます", ["む"]],
  ["ります", ["る"]],
  ["います", ["う", "いる"]],
  ["ます",   ["る"]],

  // ません (polite negative)
  ["きません", ["く"]],
  ["ぎません", ["ぐ"]],
  ["しません", ["す", "する"]],
  ["ちません", ["つ"]],
  ["にません", ["ぬ"]],
  ["びません", ["ぶ"]],
  ["みません", ["む"]],
  ["りません", ["る"]],
  ["いません", ["う", "いる"]],
  ["ません",   ["る"]],

  // た (past plain)
  ["いた",  ["く"]],
  ["いだ",  ["ぐ"]],
  ["した",  ["す", "する"]],
  ["った",  ["う", "つ", "る"]],
  ["んだ",  ["ぬ", "ぶ", "む"]],
  ["た",    ["る"]],

  // て (te-form)
  ["いて",  ["く"]],
  ["いで",  ["ぐ"]],
  ["して",  ["す", "する"]],
  ["って",  ["う", "つ", "る"]],
  ["んで",  ["ぬ", "ぶ", "む"]],
  ["て",    ["る"]],

  // ない (plain negative)
  ["かない", ["く"]],
  ["がない", ["ぐ"]],
  ["さない", ["す"]],
  ["たない", ["つ"]],
  ["なない", ["ぬ"]],
  ["ばない", ["ぶ"]],
  ["まない", ["む"]],
  ["らない", ["る"]],
  ["わない", ["う"]],
  ["ない",   ["る"]],

  // i-adjective
  ["くない",  ["い"]],
  ["かった",  ["い"]],
  ["くて",    ["い"]],
  ["ければ",  ["い"]],
];

// Returns candidate dictionary forms for an inflected word.
// The original word is always first; additional candidates follow (de-duped).
export function deinflect(word: string): string[] {
  const candidates = new Set<string>([word]);
  for (const [suffix, replacements] of RULES) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, word.length - suffix.length);
      if (stem.length === 0) continue;
      for (const r of replacements) candidates.add(stem + r);
    }
  }
  return [...candidates];
}
