import { describe, it, expect } from "vitest";
import { deinflect } from "../../src/lib/deinflect";

describe("deinflect", () => {
  it("always includes the original word first", () => {
    expect(deinflect("食べます")[0]).toBe("食べます");
    expect(deinflect("xyz")[0]).toBe("xyz");
  });

  it("handles ます across godan rows", () => {
    expect(deinflect("書きます")).toContain("書く");
    expect(deinflect("泳ぎます")).toContain("泳ぐ");
    expect(deinflect("話します")).toContain("話す");
    expect(deinflect("待ちます")).toContain("待つ");
    expect(deinflect("死にます")).toContain("死ぬ");
    expect(deinflect("遊びます")).toContain("遊ぶ");
    expect(deinflect("読みます")).toContain("読む");
    expect(deinflect("帰ります")).toContain("帰る");
    expect(deinflect("買います")).toContain("買う");
  });

  it("handles ichidan ます (食べます → 食べる)", () => {
    expect(deinflect("食べます")).toContain("食べる");
  });

  it("handles します as both godan す-stem and する irregular", () => {
    const r = deinflect("勉強します");
    expect(r).toContain("勉強す");
    expect(r).toContain("勉強する");
  });

  it("handles います ambiguity (う-godan vs ichidan いる)", () => {
    const r = deinflect("います");
    // stem is empty for います alone; only longer forms expand
    expect(r).toContain("います");
    const r2 = deinflect("見います");
    expect(r2).toContain("見う");
    expect(r2).toContain("見いる");
  });

  it("handles ません negatives mirror ます endings", () => {
    expect(deinflect("書きません")).toContain("書く");
    expect(deinflect("食べません")).toContain("食べる");
    expect(deinflect("勉強しません")).toEqual(expect.arrayContaining(["勉強す", "勉強する"]));
  });

  it("handles past plain た across godan", () => {
    expect(deinflect("書いた")).toContain("書く");
    expect(deinflect("泳いだ")).toContain("泳ぐ");
    expect(deinflect("話した")).toContain("話す");
    expect(deinflect("食べた")).toContain("食べる");
  });

  it("handles ambiguous った -> う/つ/る all expanded", () => {
    const r = deinflect("買った");
    expect(r).toEqual(expect.arrayContaining(["買う", "買つ", "買る"]));
  });

  it("handles ambiguous んだ -> ぬ/ぶ/む all expanded", () => {
    const r = deinflect("飛んだ");
    expect(r).toEqual(expect.arrayContaining(["飛ぬ", "飛ぶ", "飛む"]));
  });

  it("handles te-form (て/で)", () => {
    expect(deinflect("書いて")).toContain("書く");
    expect(deinflect("泳いで")).toContain("泳ぐ");
    expect(deinflect("食べて")).toContain("食べる");
    expect(deinflect("買って")).toEqual(expect.arrayContaining(["買う", "買つ", "買る"]));
    expect(deinflect("飛んで")).toEqual(expect.arrayContaining(["飛ぬ", "飛ぶ", "飛む"]));
  });

  it("handles ない negatives across godan and ichidan", () => {
    expect(deinflect("書かない")).toContain("書く");
    expect(deinflect("泳がない")).toContain("泳ぐ");
    expect(deinflect("話さない")).toContain("話す");
    expect(deinflect("待たない")).toContain("待つ");
    expect(deinflect("死なない")).toContain("死ぬ");
    expect(deinflect("遊ばない")).toContain("遊ぶ");
    expect(deinflect("読まない")).toContain("読む");
    expect(deinflect("帰らない")).toContain("帰る");
    expect(deinflect("買わない")).toContain("買う");
    expect(deinflect("食べない")).toContain("食べる");
  });

  it("handles i-adjective inflections", () => {
    expect(deinflect("早くない")).toContain("早い");
    expect(deinflect("早かった")).toContain("早い");
    expect(deinflect("早くて")).toContain("早い");
    expect(deinflect("早ければ")).toContain("早い");
  });

  it("skips empty-stem expansions", () => {
    // ます alone (suffix == word) produces stem "" -- should not add "る"
    const r = deinflect("ます");
    expect(r).toEqual(["ます"]);
  });

  it("dedupes candidates", () => {
    const r = deinflect("食べる");
    expect(new Set(r).size).toBe(r.length);
  });

  it("returns just the input for non-Japanese strings", () => {
    expect(deinflect("hello")).toEqual(["hello"]);
  });
});
