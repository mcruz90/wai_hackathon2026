import type { Listing } from "@prisma/client";
import { prisma } from "./db";
import { config, DAY_MS, LANGUAGE_REPORTS_TO_SHOW, NEARBY_KM } from "./config";
import { cleanFsa, isOntarioFsa } from "./fsa";
import { score, type Reported } from "./ranking";
import { LANGS, type Lang } from "./i18n";

export type PublicListing = {
  id: string; clinic: string; area: string; providerType: "family_doctor" | "nurse_practitioner";
  languages: string[]; phone: string | null; sourceType: string; sourceUrl: string | null;
  confirmedAt: string; age: number; daysLeft: number; isSample: boolean;
  d: number | null; lm: boolean; fr: number; score: number;
  /** Matched only because patients reported it; interpreter reported; languages not listed and unknown. */
  byReport: boolean; li: boolean; lu: boolean;
  reported: Reported;
};

const NO_REPORTS: Reported = { spoke: [], interpreter: [] };

/** Languages patients reported for each listing, kept once at least LANGUAGE_REPORTS_TO_SHOW separate reports agree. */
export async function reportedLanguages(ids: string[]): Promise<Map<string, Reported>> {
  const out = new Map<string, Reported>();
  if (!ids.length) return out;
  const groups = await prisma.languageReport.groupBy({ by: ["listingId", "language", "outcome"], where: { listingId: { in: ids } }, _count: { _all: true } });
  for (const g of groups) {
    if (g._count._all < LANGUAGE_REPORTS_TO_SHOW || (g.outcome !== "spoke" && g.outcome !== "interpreter")) continue;
    const r = out.get(g.listingId) ?? { spoke: [], interpreter: [] };
    (g.outcome === "spoke" ? r.spoke : r.interpreter).push(g.language);
    out.set(g.listingId, r);
  }
  return out;
}

export type Search = { fsa: string; lang: Lang; type: "any" | "fd" | "np" };

export function parseSearch(sp: Record<string, string | string[] | undefined>): Search {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
  const lang = one(sp.lang) as Lang;
  const type = one(sp.type);
  const fsa = cleanFsa(one(sp.fsa));
  return { fsa: isOntarioFsa(fsa) ? fsa : "", lang: LANGS.includes(lang) ? lang : "en", type: type === "fd" || type === "np" ? type : "any" };
}

export function searchQuery(s: Search): string {
  return new URLSearchParams({ lang: s.lang, fsa: s.fsa, type: s.type }).toString();
}

export async function originFor(fsa: string): Promise<{ at: [number, number] | null; known: boolean }> {
  const row = fsa ? await prisma.fsaCentroid.findUnique({ where: { fsa } }) : null;
  return row ? { at: [row.lat, row.lng], known: true } : { at: null, known: false };
}

/** Patients only ever see listings that are live and not past their expiry date. */
export const liveWhere = () => ({ status: "live" as const, expiresAt: { gt: new Date() }, lastConfirmedAt: { not: null } });

export function toPublic(l: Listing, origin: [number, number] | null, matchLangs: string[], reported: Reported = NO_REPORTS): PublicListing {
  const now = new Date();
  const s = score({ lat: l.lat, lng: l.lng, languages: l.languages, lastConfirmedAt: l.lastConfirmedAt! }, origin, matchLangs, config.expiryDays, now, reported);
  return {
    id: l.id, clinic: l.clinic, area: l.area, providerType: l.providerType, languages: l.languages, phone: l.phone,
    sourceType: l.sourceType, sourceUrl: l.sourceUrl, confirmedAt: l.lastConfirmedAt!.toISOString(), age: s.age,
    daysLeft: Math.max(1, Math.ceil((l.expiresAt!.getTime() - now.getTime()) / DAY_MS)), isSample: l.isSample,
    d: s.d, lm: s.lm, fr: s.fr, score: s.score, byReport: s.byReport, li: s.li, lu: s.lu, reported,
  };
}

export async function rankedListings(s: Search, matchLangs: string[]): Promise<{ listings: PublicListing[]; known: boolean }> {
  const { at, known } = await originFor(s.fsa);
  if (!at) return { listings: [], known: false };
  const latDelta = config.searchRadiusKm / 110.6;
  const lngDelta = config.searchRadiusKm / (111.3 * Math.cos(at[0]*Math.PI/180));
  const rows = await prisma.listing.findMany({
    where: { ...liveWhere(), lat: { gte: at[0]-latDelta, lte: at[0]+latDelta }, lng: { gte: at[1]-lngDelta, lte: at[1]+lngDelta }, ...(s.type === "any" ? {} : { providerType: s.type === "np" ? "nurse_practitioner" : "family_doctor" }) },
  });
  const reports = await reportedLanguages(rows.map((r) => r.id));
  const listings = rows.map((l) => toPublic(l, at, matchLangs, reports.get(l.id))).filter((l) => l.d !== null && l.d <= config.searchRadiusKm).sort((a, b) => b.score - a.score);
  return { listings, known };
}

/** True when no live listing within the nearby radius is known to offer the language (listed or reported by patients). */
export function noLanguageMatchNearby(listings: PublicListing[]): boolean {
  return !listings.some((l) => l.lm && l.d !== null && l.d <= NEARBY_KM);
}

export function expiryFrom(confirmed: Date): Date {
  return new Date(confirmed.getTime() + config.expiryDays * DAY_MS);
}
