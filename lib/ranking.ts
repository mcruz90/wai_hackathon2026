import { DAY_MS, NEARBY_KM } from "./config";
import { km } from "./fsa";

/** Ranking weights. Language 45%, freshness 30%, distance 25%. */
export const WEIGHTS = { language: 0.45, freshness: 0.3, distance: 0.25 };

export type Rankable = { lat: number; lng: number; languages: string[]; lastConfirmedAt: Date };

export function ageDays(lastConfirmedAt: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - lastConfirmedAt.getTime()) / DAY_MS));
}

export function score(l: Rankable, origin: [number, number] | null, matchLangs: string[], expiryDays: number, now = new Date()) {
  const d = origin ? km(origin, [l.lat, l.lng]) : null;
  const lm = l.languages.some((x) => matchLangs.includes(x));
  const age = ageDays(l.lastConfirmedAt, now);
  const fr = Math.max(0, 1 - age / expiryDays);
  const total = WEIGHTS.language * (lm ? 1 : 0) + WEIGHTS.freshness * fr + WEIGHTS.distance * (d === null ? 0 : Math.max(0, 1 - d / NEARBY_KM));
  return { d, lm, age, fr, score: total };
}
