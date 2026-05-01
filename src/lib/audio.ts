import { useStore } from "../store";
import { AUDIO_DEFAULT_URL } from "./constants";

function getTemplate(): string {
  const override = useStore.getState().settings.audioServerUrl.trim();
  return override || AUDIO_DEFAULT_URL;
}

let currentAudio: HTMLAudioElement | null = null;

function buildLookupUrl(word: string, reading: string, template: string): string {
  return template
    .replace("{term}", encodeURIComponent(word))
    .replace("{reading}", encodeURIComponent(reading));
}

interface AudioManifest {
  type?: string;
  audioSources?: { url: string; name?: string }[];
}

// Yomitan-style audio servers return either direct audio bytes or a JSON
// manifest listing source URLs. Resolve to a direct, browser-reachable URL.
async function resolveAudioUrl(lookupUrl: string): Promise<string> {
  const res = await fetch(lookupUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) return lookupUrl; // already audio
  const manifest = (await res.json()) as AudioManifest;
  const first = manifest.audioSources?.[0]?.url;
  if (!first) throw new Error("no audio sources in manifest");
  // Rewrite manifest source origin to match the configured server host.
  const origin = new URL(lookupUrl).origin;
  return first.replace(/^https?:\/\/[^/]+/, origin);
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
    u.lang = "ja-JP";
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/**
 * Play pronunciation for a word. When local audio is enabled, fetches from the
 * configured Yomitan audio server and does not fall back to TTS. When disabled,
 * uses browser TTS directly.
 */
export async function playPronunciation(word: string, reading: string): Promise<void> {
  stopAll();
  const { localAudioEnabled } = useStore.getState().settings;
  if (!localAudioEnabled) {
    await speakTTS(reading || word);
    return;
  }
  const template = getTemplate();
  const lookupUrl = buildLookupUrl(word, reading, template);
  const audioUrl = await resolveAudioUrl(lookupUrl);
  await playUrl(audioUrl);
}
