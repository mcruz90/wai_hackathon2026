"use client";
import { useEffect, useState } from "react";

/** Primary language subtag, with Tagalog and Filipino treated as one ("tl" and "fil"). */
const primary = (tag: string) => {
  const p = tag.toLowerCase().split(/[-_]/)[0];
  return p === "tl" ? "fil" : p;
};

/**
 * Reads one line aloud with the browser's own speech (no server, no API key).
 * English (the default) is spoken even without an English voice, as before. Any other language is
 * offered only when the device has a voice for it, so the text is never read with the wrong voice.
 * Renders nothing where the browser has no speech support.
 */
export default function Speak({ text, label, lang = "en-CA" }: { text: string; label: string; lang?: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const english = primary(lang) === "en";

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    // Some browsers load their voices after the page.
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const voice = voices?.find((v) => v.lang?.toLowerCase() === lang.toLowerCase()) ?? voices?.find((v) => v.lang && primary(v.lang) === primary(lang));
  if (!voices || (!voice && !english)) return null;

  function play() {
    const speech = window.speechSynthesis;
    speech.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    if (voice) u.voice = voice;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    setPlaying(true);
    speech.speak(u);
  }

  return (
    <button type="button" className="speak" onClick={play} aria-pressed={playing} aria-label={`${label}: ${text}`}>
      <span aria-hidden="true">🔊</span> {label}
    </button>
  );
}
