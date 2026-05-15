import { describe, it, expect, beforeEach } from "vitest";
import { installLocalStorage } from "../setup/localStorage";

installLocalStorage();

const {
  SETTINGS_STORAGE_KEY,
  SETTINGS_LEGACY_KEY,
  SETTINGS_LEGACY_KEY_V2,
} = await import("../../src/lib/constants");
const { loadSettings, saveSettings, DEFAULT_SETTINGS } = await import("../../src/lib/settings");

beforeEach(() => {
  (globalThis as { localStorage: Storage }).localStorage.clear();
});

describe("loadSettings — defaults", () => {
  it("returns defaults when no key is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults on corrupt JSON", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{not-json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("loadSettings — v1 → v3 migration", () => {
  it("preserves audioAutoPlay, audioServerUrl, and edgeVisibility", () => {
    localStorage.setItem(
      SETTINGS_LEGACY_KEY,
      JSON.stringify({
        audioAutoPlay: false,
        audioServerUrl: "http://example/{term}",
        edgeVisibility: { "shared-kanji": false },
        somethingElse: "dropped",
      }),
    );
    const s = loadSettings();
    expect(s.audioAutoPlay).toBe(false);
    expect(s.audioServerUrl).toBe("http://example/{term}");
    expect(s.edgeVisibility["shared-kanji"]).toBe(false);
    // other edge types fall back to defaults
    expect(s.edgeVisibility["same-reading"]).toBe(DEFAULT_SETTINGS.edgeVisibility["same-reading"]);
    // unrelated fields take defaults
    expect(s.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(s.edgeColors).toEqual(DEFAULT_SETTINGS.edgeColors);
  });

  it("ignores wrong-typed v1 fields", () => {
    localStorage.setItem(SETTINGS_LEGACY_KEY, JSON.stringify({ audioAutoPlay: "yes" }));
    expect(loadSettings().audioAutoPlay).toBe(DEFAULT_SETTINGS.audioAutoPlay);
  });
});

describe("loadSettings — v2 → v3 migration", () => {
  it("carries v2 fields forward and forces theme=dark", () => {
    localStorage.setItem(
      SETTINGS_LEGACY_KEY_V2,
      JSON.stringify({
        audioAutoPlay: false,
        animationSpeed: "fast",
        edgeVisibility: { "same-reading": false },
      }),
    );
    const s = loadSettings();
    expect(s.audioAutoPlay).toBe(false);
    expect(s.animationSpeed).toBe("fast");
    expect(s.edgeVisibility["same-reading"]).toBe(false);
    expect(s.theme).toBe("dark");
    // edgeColors are rebuilt from defaults rather than carried (none in v2 anyway)
    expect(s.edgeColors).toEqual(DEFAULT_SETTINGS.edgeColors);
  });
});

describe("loadSettings — v3 reload", () => {
  it("round-trips via saveSettings", () => {
    const stored = { ...DEFAULT_SETTINGS, animationSpeed: "fast" as const, theme: "light" as const };
    saveSettings(stored);
    expect(loadSettings()).toEqual(stored);
  });

  it("strips the obsolete focusZoom field on read", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, focusZoom: 3.2 }),
    );
    const s = loadSettings();
    expect(s).not.toHaveProperty("focusZoom");
  });

  it("merges partial edgeVisibility / edgeColors over defaults", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        edgeVisibility: { "shared-kanji": false },
        edgeColors: { "shared-kanji": "#abcdef" },
      }),
    );
    const s = loadSettings();
    expect(s.edgeVisibility["shared-kanji"]).toBe(false);
    expect(s.edgeVisibility["same-reading"]).toBe(DEFAULT_SETTINGS.edgeVisibility["same-reading"]);
    expect(s.edgeColors["shared-kanji"]).toBe("#abcdef");
    expect(s.edgeColors["same-reading"]).toBe(DEFAULT_SETTINGS.edgeColors["same-reading"]);
  });

  it("prefers v3 over legacy keys when both are present", () => {
    localStorage.setItem(SETTINGS_LEGACY_KEY, JSON.stringify({ audioAutoPlay: false }));
    localStorage.setItem(SETTINGS_LEGACY_KEY_V2, JSON.stringify({ audioAutoPlay: false }));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ audioAutoPlay: true }));
    expect(loadSettings().audioAutoPlay).toBe(true);
  });
});
