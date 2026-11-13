import test from "node:test";
import assert from "node:assert/strict";
import { batchEligibility, clinicSourceHosts, evidenceDate, possibleDuplicate, reviewVersion, sourceHost, type ReviewContext, type ReviewListing } from "../lib/review-policy";

const now = new Date("2026-11-11T12:00:00Z");
function fixture(): ReviewListing {
  return { id: "clinic1", clinic: "Fernleaf Family Practice", area: "Scarborough", fsa: "M1P", lat: 43.7, lng: -79.2,
    providerType: "family_doctor", languages: ["English", "Tagalog"], phone: "416-555-0145", sourceType: "web", sourceUrl: "https://fernleaf.example/news",
    rawText: "2026-11-10: Fernleaf Family Practice in Scarborough M1P is accepting new patients with a family doctor. Care in English and Tagalog. Call 416-555-0145.",
    confidence: { location: "high", provider_type: "high", provider_type_read: "family_doctor", languages: "high", date: "high", date_read: "2026-11-10", accepting: "yes", notes: "" },
    status: "pending", lastConfirmedAt: null, expiresAt: null, isSample: false, createdAt: now, _count: { fullReports: 0, proposals: 0 } };
}
const ctx = (l: ReviewListing): ReviewContext => ({ now, hosts: ["fernleaf.example"], fsas: ["M1P"], listings: [l], requireTrustedSource: true });

test("complete, recent, supported clinic evidence qualifies with its original date", () => {
  const l = fixture(), result = batchEligibility(l, ctx(l));
  assert.deepEqual(result.reasons, []);
  assert.equal(result.confirmed?.toISOString(), "2026-11-10T00:00:00.000Z");
});

test("source trust is explicit, HTTPS, exact-host, and not inferred from source type", () => {
  assert.deepEqual(clinicSourceHosts(" Fernleaf.Example,fernleaf.example,*.example,https://bad.example "), ["fernleaf.example"]);
  for (const source of ["http://fernleaf.example/a", "https://fernleaf.example.evil.test", "https://staff.fernleaf.example", "https://user@fernleaf.example", "https://fernleaf.example:444"]) {
    const l = { ...fixture(), sourceUrl: source };
    assert.equal(batchEligibility(l, ctx(l)).eligible, false, source);
  }
  assert.equal(sourceHost("javascript:alert(1)"), null);
  const l = fixture();
  assert.equal(batchEligibility(l, { ...ctx(l), hosts: [] }).eligible, false);
  assert.equal(batchEligibility({ ...l, sourceType: "post" }, ctx(l)).eligible, false);
});

test("with trusted sources switched off, any public HTTPS source can qualify, but a link is still required", () => {
  const l = { ...fixture(), sourceType: "post", sourceUrl: "https://community.example/post/1" };
  const open = (x: ReviewListing) => ({ ...ctx(x), hosts: [], requireTrustedSource: false });
  assert.equal(batchEligibility(l, open(l)).eligible, true);
  for (const sourceUrl of [null, "http://community.example/post/1", "https://user@community.example/x"]) {
    const x = { ...l, sourceUrl };
    assert.equal(batchEligibility(x, open(x)).eligible, false, String(sourceUrl));
  }
});

test("high model confidence alone cannot bypass missing evidence, uncertainty, or invalid dates", () => {
  const original = fixture();
  for (const change of [
    { rawText: "A high confidence claim without source evidence" },
    { rawText: original.rawText!.replace("Tagalog", "French") },
    { rawText: original.rawText!.replace("accepting new patients", "not accepting new patients") },
    { phone: null }, { fsa: "Z9Z" }, { clinic: "" }, { languages: [] },
    { confidence: { ...(original.confidence as object), accepting: "unclear" } },
    { confidence: { ...(original.confidence as object), notes: "Date may be wrong" } },
    { confidence: { ...(original.confidence as object), date_read: "2026-11-12" } },
    { confidence: { ...(original.confidence as object), date_read: "2026-10-01" } },
    { confidence: { ...(original.confidence as object), date_read: "2026-02-30" } },
    { confidence: { ...(original.confidence as object), languages: "medium" } },
  ]) {
    const l = { ...original, ...change } as ReviewListing;
    assert.equal(batchEligibility(l, ctx(l)).eligible, false, JSON.stringify(change));
  }
  assert.equal(evidenceDate("2026-02-30", now), null);
});

test("reports, proposals, and duplicates including pending or full clinics require individual review", () => {
  const l = fixture();
  assert.equal(batchEligibility({ ...l, _count: { fullReports: 1, proposals: 0 } }, ctx(l)).eligible, false);
  assert.equal(batchEligibility({ ...l, _count: { fullReports: 0, proposals: 1 } }, ctx(l)).eligible, false);
  for (const status of ["pending", "live", "full", "expired"] as const) {
    const other = { ...l, id: "other", status, phone: "+1 (416) 555-0145" };
    assert.equal(batchEligibility(l, { ...ctx(l), listings: [l, other] }).eligible, false);
  }
  assert.equal(possibleDuplicate(l, { ...l, id: "other", isSample: true }), false);
});

test("approved version covers evidence, extracted fields, status, and conflict counts", () => {
  const l = fixture(), version = reviewVersion(l);
  for (const change of [{ rawText: "changed" }, { sourceUrl: "https://other.example" }, { languages: ["French"] }, { status: "live" }, { _count: { fullReports: 1, proposals: 0 } }]) {
    assert.notEqual(reviewVersion({ ...l, ...change } as ReviewListing), version);
  }
  assert.equal(reviewVersion({ ...l, confidence: Object.fromEntries(Object.entries(l.confidence as object).reverse()) }), version);
});
