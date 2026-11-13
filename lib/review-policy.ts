import { createHash } from "node:crypto";
import type { Listing } from "@prisma/client";
import { config, DAY_MS } from "./config";

export const REVIEW_POLICY = "new-listing-batch-v1";
export const MAX_REVIEW_BATCH = 100;
export type ReviewListing = Listing & { _count: { fullReports: number; proposals: number } };
/**
 * requireTrustedSource: only notices from clinic websites a person marked as trusted can be batch-published.
 * Off by default for the prototype (REQUIRE_TRUSTED_CLINIC_SOURCE=true turns it on, as a pilot should): then any notice
 * with a public HTTPS source link can be batch-published, if every other check passes. A person still authorizes each batch.
 */
export type ReviewContext = { hosts: string[]; fsas: string[]; listings: ReviewListing[]; now: Date; requireTrustedSource?: boolean };
export const requireTrustedSource = () => process.env.REQUIRE_TRUSTED_CLINIC_SOURCE === "true";

/** Exact hostnames only. No implicit trust for subdomains, community posts, or pasted URLs. */
export function clinicSourceHosts(value = process.env.CLINIC_SOURCE_HOSTS ?? ""): string[] {
  return [...new Set(value.split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(s)))].sort();
}

export function sourceHost(source: string | null): string | null {
  try {
    const url = new URL(source ?? "");
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") ? url.hostname : null;
  } catch { return null; }
}

/** Round-trip validation rejects dates such as February 30, which Date.parse normalizes. */
export function evidenceDate(value: unknown, now: Date): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= now ? date : null;
}

const textKey = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const phoneKey = (s: string | null) => (s ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

export function possibleDuplicate(a: Listing, b: Listing): boolean {
  if (a.id === b.id || a.isSample !== b.isSample) return false;
  const phone = phoneKey(a.phone), name = textKey(a.clinic), other = textKey(b.clinic);
  return (!!phone && phone.length === 10 && phone === phoneKey(b.phone)) ||
    (name.length >= 4 && other.length >= 4 && (name.includes(other) || other.includes(name)));
}

/**
 * The day discovery read the page, for notices it collected. Clinic web pages rarely carry a date, but discovery fetched
 * this page itself on a known day, so "the clinic's own page said this on that day" is evidence of the same kind.
 */
export function retrievedDate(c: Record<string, unknown>, now: Date): Date | null {
  const d = c.discovery as Record<string, unknown> | null | undefined;
  return d && typeof d.retrieved_at === "string" ? evidenceDate(d.retrieved_at.slice(0, 10), now) : null;
}

// Languages a notice in Ontario is likely to name. If the notice says care is given in one ("we speak Punjabi", "care in
// English and Tagalog"), an empty languages field is an extraction miss. A bare "English | Français" menu does not count.
const LANGS = "english|french|français|mandarin|cantonese|chinese|punjabi|hindi|urdu|tamil|gujarati|bengali|arabic|farsi|persian|dari|pashto|tagalog|filipino|spanish|portuguese|italian|polish|russian|ukrainian|korean|vietnamese|somali|amharic|tigrinya|turkish|greek|german|japanese";
const CUE = "speak|speaks|spoken|language|languages|care in|services in|service in|offered in|available in|fluent|bilingual|multilingual";
const LANGUAGE_CLAIM = new RegExp(`\\b(?:${CUE})\\b[^.!?\\n]{0,80}\\b(?:${LANGS})\\b|\\b(?:${LANGS})\\b[^.!?\\n]{0,40}\\b(?:${CUE})\\b`, "i");
export const namesALanguage = (raw: string) => LANGUAGE_CLAIM.test(raw);

/** True when the notice says the clinic is accepting new patients in a sentence with no negation, and no such sentence is negated. */
export function saysAccepting(raw: string): boolean {
  const sentences = raw.split(/[.!?\n]+/).filter((s) => /\baccepting new patients\b/i.test(s));
  const negated = (s: string) => /\b(not|no longer|aren't|isn't|stopped|stop|cannot|can't|unable)\b/i.test(s);
  return sentences.length > 0 && !sentences.some(negated);
}

export function batchEligibility(l: ReviewListing, ctx: ReviewContext): { eligible: boolean; reasons: string[]; confirmed: Date | null } {
  const c = (l.confidence ?? {}) as Record<string, unknown>;
  const reasons: string[] = [];
  const host = sourceHost(l.sourceUrl), raw = l.rawText ?? "", text = textKey(raw);
  const dated = evidenceDate(c.date_read, ctx.now);
  // No date in the notice: discovery's own read date counts (the reviewer sees it as the confirmed date).
  const fetched = dated ? null : retrievedDate(c, ctx.now);
  const confirmed = dated ?? fetched;
  // Languages may be empty when the notice names none: patients then see "Languages not listed. Ask when you call."
  const noLanguages = !l.languages.length && !namesALanguage(raw);
  if (l.status !== "pending") reasons.push("No longer pending");
  const trusted = ctx.requireTrustedSource ?? requireTrustedSource();
  if (trusted && (l.sourceType !== "web" || !host || !ctx.hosts.includes(host))) reasons.push("Source is not a configured clinic website");
  if (!trusted && !host) reasons.push("No public HTTPS source link to check");
  if (!l.clinic.trim() || !l.area.trim() || !l.fsa || !ctx.fsas.includes(l.fsa) || (!l.languages.length && !noLanguages) || phoneKey(l.phone).length !== 10) reasons.push("Missing clinic, area, supported postal area, languages, or phone");
  if (c.provider_type_read !== l.providerType) reasons.push("Provider type needs checking");
  if (c.accepting !== "yes") reasons.push("Acceptance of new patients is unclear");
  // A field that is empty on purpose (no date, no languages stated) has nothing to be unsure about. Notes and the
  // extractor's needs_review flag only count when they come from something other than those two gaps.
  const unsureKeys = ["location", "provider_type", ...(noLanguages ? [] : ["languages"]), ...(fetched ? [] : ["date"])];
  const onlyGaps = (fetched || noLanguages) && !unsureKeys.some((k) => c[k] === "low");
  if (unsureKeys.some((k) => c[k] !== "high") || (!onlyGaps && (c.notes || c.needs_review === true))) reasons.push("Extraction contains uncertainty");
  if (!confirmed || ctx.now.getTime() - confirmed.getTime() >= Math.min(14, config.expiryDays) * DAY_MS) reasons.push("Evidence needs a valid date within the last 14 days and expiry window");
  // Literal support is deliberately conservative; other wording stays available for individual review.
  if (!raw || !text.includes(textKey(l.clinic)) || !text.includes(textKey(l.area)) || !l.fsa || !text.includes(textKey(l.fsa)) ||
    !l.languages.every((lang) => !!lang.trim() && text.includes(textKey(lang))) || !phoneKey(raw).includes(phoneKey(l.phone)) ||
    (!fetched && (typeof c.date_read !== "string" || !raw.includes(c.date_read))) ||
    !(l.providerType === "family_doctor" ? /family (doctor|physician|medicine)/i : /nurse practitioner/i).test(raw) ||
    // Negation is checked only in the sentence that makes the claim: a full web page always has a "not" somewhere.
    !saysAccepting(raw)) reasons.push("Pasted text needs an individual evidence check");
  if (l._count.fullReports || l._count.proposals) reasons.push("Patient reports or pending proposals need investigation");
  if (ctx.listings.some((other) => possibleDuplicate(l, other))) reasons.push("Possible duplicate clinic or shared phone");
  return { eligible: reasons.length === 0, reasons, confirmed };
}

// Stable JSON also makes the audit record readable without depending on the current listing.
export function reviewSnapshot(l: ReviewListing): Record<string, unknown> {
  return JSON.parse(JSON.stringify(l));
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
  return value;
}
export function reviewVersion(l: ReviewListing): string {
  return createHash("sha256").update(JSON.stringify(stable(reviewSnapshot(l)))).digest("hex");
}
