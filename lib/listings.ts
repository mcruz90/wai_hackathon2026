import type { Listing } from "@prisma/client";
import { prisma } from "./db";
import { config, DAY_MS, NEARBY_KM } from "./config";
import { cleanFsa, DOWNTOWN } from "./fsa";
import { score } from "./ranking";
import { LANGS, type Lang } from "./i18n";

export type PublicListing = {
  id: string; clinic: string; area: string; providerType: "family_doctor" | "nurse_practitioner";
  languages: string[]; phone: string | null; sourceType: string; sourceUrl: string | null;
  confirmedAt: string; age: number; daysLeft: number; isSample: boolean;
  d: number; lm: boolean; fr: number; score: number;
};

export type Search = { fsa: string; lang: Lang; type: "any" | "fd" | "np" };

export function parseSearch(sp: Record<string, string | string[] | undefined>): Search {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
  const lang = one(sp.lang) as Lang;
  const type = one(sp.type);
  return { fsa: cleanFsa(one(sp.fsa)), lang: LANGS.includes(lang) ? lang : "en", type: type === "fd" || type === "np" ? type : "any" };
}

export function searchQuery(s: Search): string {
  return new URLSearchParams({ lang: s.lang, fsa: s.fsa, type: s.type }).toString();
}

export async function originFor(fsa: string): Promise<{ at: [number, number]; known: boolean }> {
  const row = fsa ? await prisma.fsaCentroid.findUnique({ where: { fsa } }) : null;
  return row ? { at: [row.lat, row.lng], known: true } : { at: DOWNTOWN, known: false };
}

/** Patients only ever see listings that are live and not past their expiry date. */
export const liveWhere = () => ({ status: "live" as const, expiresAt: { gt: new Date() }, lastConfirmedAt: { not: null } });

export function toPublic(l: Listing, origin: [number, number], matchLangs: string[]): PublicListing {
  const now = new Date();
  const s = score({ lat: l.lat, lng: l.lng, languages: l.languages, lastConfirmedAt: l.lastConfirmedAt! }, origin, matchLangs, config.expiryDays, now);
  return {
    id: l.id, clinic: l.clinic, area: l.area, providerType: l.providerType, languages: l.languages, phone: l.phone,
    sourceType: l.sourceType, sourceUrl: l.sourceUrl, confirmedAt: l.lastConfirmedAt!.toISOString(), age: s.age,
    daysLeft: Math.max(1, Math.ceil((l.expiresAt!.getTime() - now.getTime()) / DAY_MS)), isSample: l.isSample,
    d: s.d, lm: s.lm, fr: s.fr, score: s.score,
  };
}

export async function rankedListings(s: Search, matchLangs: string[]): Promise<{ listings: PublicListing[]; known: boolean }> {
  const { at, known } = await originFor(s.fsa);
  const rows = await prisma.listing.findMany({
    where: { ...liveWhere(), ...(s.type === "any" ? {} : { providerType: s.type === "np" ? "nurse_practitioner" : "family_doctor" }) },
  });
  const listings = rows.map((l) => toPublic(l, at, matchLangs)).sort((a, b) => b.score - a.score);
  return { listings, known };
}

/** True when no live listing within the nearby radius offers the language. */
export function noLanguageMatchNearby(listings: PublicListing[]): boolean {
  return !listings.some((l) => l.lm && l.d <= NEARBY_KM);
}

export function expiryFrom(confirmed: Date): Date {
  return new Date(confirmed.getTime() + config.expiryDays * DAY_MS);
}
