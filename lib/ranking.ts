import { DAY_MS, NEARBY_KM } from "./config";
import { km } from "./fsa";

/** Ranking weights. Language 45%, freshness 30%, distance 25%. */
export const WEIGHTS = { language: 0.45, freshness: 0.3, distance: 0.25 };

export type Rankable = { lat: number; lng: number; languages: string[]; lastConfirmedAt: Date };
/** Languages patients reported after calling: spoken by staff, or offered through an interpreter. */
export type Reported = { spoke: string[]; interpreter: string[] };

/**
 * Language part of the score, from 0 to 1.
 * Listed or patient-reported match 1, interpreter reported 0.6, languages not listed 0.4, listed but no match 0.
 * Unknown ranks above a known "no", because most real notices do not list languages at all.
 * For English, a listing with no languages is treated as a match: clinics in Ontario work in English.
 */
export const LANGUAGE_SCORE = { match: 1, interpreter: 0.6, unknown: 0.4, none: 0 };

export function ageDays(lastConfirmedAt: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - lastConfirmedAt.getTime()) / DAY_MS));
}

export function score(l: Rankable, origin: [number, number] | null, matchLangs: string[], expiryDays: number, now = new Date(), reported: Reported = { spoke: [], interpreter: [] }) {
  const d = origin ? km(origin, [l.lat, l.lng]) : null;
  const listed = l.languages.some((x) => matchLangs.includes(x));
  const byReport = !listed && reported.spoke.some((x) => matchLangs.includes(x));
  const unknown = !l.languages.length && !reported.spoke.length;
  const lm = listed || byReport || (unknown && matchLangs.includes("English"));
  const li = !lm && reported.interpreter.some((x) => matchLangs.includes(x));
  const lu = !lm && !li && unknown;
  const lang = lm ? LANGUAGE_SCORE.match : li ? LANGUAGE_SCORE.interpreter : lu ? LANGUAGE_SCORE.unknown : LANGUAGE_SCORE.none;
  const age = ageDays(l.lastConfirmedAt, now);
  const fr = Math.max(0, 1 - age / expiryDays);
  const total = WEIGHTS.language * lang + WEIGHTS.freshness * fr + WEIGHTS.distance * (d === null ? 0 : Math.max(0, 1 - d / NEARBY_KM));
  return { d, lm, byReport, li, lu, age, fr, score: total };
}
