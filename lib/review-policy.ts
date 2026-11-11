import { createHash } from "node:crypto";
import type { Listing } from "@prisma/client";
import { config, DAY_MS } from "./config";

export const REVIEW_POLICY = "new-listing-batch-v1";
export const MAX_REVIEW_BATCH = 100;
export type ReviewListing = Listing & { _count: { fullReports: number; proposals: number } };
export type ReviewContext = { hosts: string[]; fsas: string[]; listings: ReviewListing[]; now: Date };

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
const phoneKey = (s: string | null) => (s ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

export function possibleDuplicate(a: Listing, b: Listing): boolean {
  if (a.id === b.id || a.isSample !== b.isSample) return false;
  const phone = phoneKey(a.phone), name = textKey(a.clinic), other = textKey(b.clinic);
  return (!!phone && phone.length === 10 && phone === phoneKey(b.phone)) ||
    (name.length >= 4 && other.length >= 4 && (name.includes(other) || other.includes(name)));
}

export function batchEligibility(l: ReviewListing, ctx: ReviewContext): { eligible: boolean; reasons: string[]; confirmed: Date | null } {
  const c = (l.confidence ?? {}) as Record<string, unknown>;
  const reasons: string[] = [];
  const host = sourceHost(l.sourceUrl), raw = l.rawText ?? "", text = textKey(raw);
  const confirmed = evidenceDate(c.date_read, ctx.now);
  if (l.status !== "pending") reasons.push("No longer pending");
  if (l.sourceType !== "web" || !host || !ctx.hosts.includes(host)) reasons.push("Source is not a configured clinic website");
  if (!l.clinic.trim() || !l.area.trim() || !l.fsa || !ctx.fsas.includes(l.fsa) || !l.languages.length || phoneKey(l.phone).length !== 10) reasons.push("Missing clinic, area, supported postal area, languages, or phone");
  if (c.provider_type_read !== l.providerType) reasons.push("Provider type needs checking");
  if (c.accepting !== "yes") reasons.push("Acceptance of new patients is unclear");
  if (["location", "provider_type", "languages", "date"].some((k) => c[k] !== "high") || c.notes || c.needs_review === true) reasons.push("Extraction contains uncertainty");
  if (!confirmed || ctx.now.getTime() - confirmed.getTime() >= Math.min(14, config.expiryDays) * DAY_MS) reasons.push("Evidence needs a valid date within the last 14 days and expiry window");
  // Literal support is deliberately conservative; other wording stays available for individual review.
  if (!raw || !text.includes(textKey(l.clinic)) || !text.includes(textKey(l.area)) || !l.fsa || !text.includes(textKey(l.fsa)) ||
    !l.languages.every((lang) => !!lang.trim() && text.includes(textKey(lang))) || !phoneKey(raw).includes(phoneKey(l.phone)) ||
    typeof c.date_read !== "string" || !raw.includes(c.date_read) ||
    !(l.providerType === "family_doctor" ? /family (doctor|physician)/i : /nurse practitioner/i).test(raw) ||
    !/\baccepting new patients\b/i.test(raw) || /\b(not|no longer|aren't|isn't|stopped|stop|cannot|can't|unable)\b/i.test(raw)) reasons.push("Pasted text needs an individual evidence check");
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
