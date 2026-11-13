"use client";
import { useEffect, useState } from "react";

/**
 * Reads one English line aloud with the browser's own speech (no server, no API key),
 * so a patient can play a question to clinic staff who speak only English.
 * Renders nothing where the browser has no speech support.
 */
export default function Speak({ text, label }: { text: string; label: string }) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined");
  }, []);
  if (!supported) return null;

  function play() {
    const speech = window.speechSynthesis;
    speech.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-CA";
    u.rate = 0.9;
    const voice = speech.getVoices().find((v) => v.lang === "en-CA") ?? speech.getVoices().find((v) => v.lang?.startsWith("en"));
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
