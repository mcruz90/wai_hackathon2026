"use client";
import { useEffect } from "react";
import { firstTime } from "@/lib/session";

/** Adds one to today's anonymous counters, once per browser session for the same search. */
export default function Track({ fsa, lang, type }: { fsa: string; lang: string; type: string }) {
  useEffect(() => {
    if (!firstTime(`search|${fsa}|${lang}|${type}`)) return;
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "search", fsa, lang, type }), keepalive: true }).catch(() => {});
  }, [fsa, lang, type]);
  return null;
}
