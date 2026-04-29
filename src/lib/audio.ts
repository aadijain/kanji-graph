import { useStore } from "../store";
import { AUDIO_DEFAULT_BASE, TTS_LANG } from "./constants";

// Read the effective audio server base at call time so runtime settings override
// the build-time VITE_AUDIO_BASE without a page reload.
function getBase(): string {
  const override = useStore.getState().settings.audioServerUrl.trim();
  if (override) return override.replace(/\/+$/, "");
  return (import.meta.env.VITE_AUDIO_BASE as string | undefined)?.replace(/\/+$/, "") ?? AUDIO_DEFAULT_BASE;
}

let currentAudio: HTMLAudioElement | null = null;

function yomitanUrl(word: string, reading: string, base: string): string {
  const t = encodeURIComponent(word);
  const r = encodeURIComponent(reading);
  return `${base}/?term=${t}&reading=${r}`;
}

interface AudioManifest {
  type?: string;
  audioSources?: { url: string; name?: string }[];
}

// Yomitan-style audio servers return either direct audio bytes or a JSON
// manifest listing source URLs. Resolve to a direct, browser-reachable URL.
async function resolveAudioUrl(url: string, base: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) return url; // already audio
  const manifest = (await res.json()) as AudioManifest;
  const first = manifest.audioSources?.[0]?.url;
  if (!first) throw new Error("no audio sources in manifest");
  // Sources point at the audio server's own origin (e.g. localhost:5050).
  // Rewrite to base so the browser reaches them via the same path
  // (Vite proxy in dev, configured base in prod).
  return first.replace(/^https?:\/\/[^/]+/, base);
}

function stopAll() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function playUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (currentAudio === audio) currentAudio = null;
      fn();
    };
    audio.addEventListener("ended", () => settle(resolve), { once: true });
    audio.addEventListener(
      "error",
      () => settle(() => reject(new Error("audio element error"))),
      { once: true },
    );

    // HTMLMediaElement.play() returns Promise<void> per spec, but some browser
    // builds still return undefined. Handle both.
    let result: unknown;
    try {
      result = audio.play();
    } catch (err) {
      settle(() => reject(err as Error));
      return;
    }
    if (
      result &&
      typeof result === "object" &&
      typeof (result as { catch?: unknown }).catch === "function"
    ) {
      (result as Promise<void>).catch((err) =>
        settle(() => reject(err as Error)),
      );
    }
    // If play() returned undefined, the 'ended'/'error' listeners drive resolution.
  });
}

function speakTTS(text: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = TTS_LANG;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/**
 * Play pronunciation for a word. Tries the local Yomitan audio server first
 * (recorded audio); falls back to the browser's Japanese TTS. Cancels any
 * playback already in progress.
 */
export async function playPronunciation(word: string, reading: string): Promise<void> {
  stopAll();
  const base = getBase();
  const lookupUrl = yomitanUrl(word, reading, base);
  try {
    const audioUrl = await resolveAudioUrl(lookupUrl, base);
    await playUrl(audioUrl);
    return;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[audio] ${lookupUrl} failed, falling back to TTS:`, err);
    }
  }
  await speakTTS(reading || word);
}
