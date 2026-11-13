import test from "node:test";
import assert from "node:assert/strict";
import { noticeMarks, reviewGuide } from "../lib/review-guide";
import type { ReviewListing } from "../lib/review-policy";

const listing = (over: Partial<ReviewListing>): ReviewListing => ({
  id: "x", clinic: "Openfield Medical Centre", area: "", fsa: null, providerType: "family_doctor", languages: [], phone: null,
  sourceUrl: "https://openfield.example/", sourceType: "web", rawText: "", status: "pending", isSample: false,
  confidence: { accepting: "unclear", location: "low", provider_type: "high", provider_type_read: "family_doctor", languages: "low", date: "low" },
  _count: { fullReports: 0, proposals: 0 }, ...over,
} as unknown as ReviewListing);

test("review guide: names the exact missing fields and flags them, most important item first", () => {
  const g = reviewGuide(listing({}), ["Missing clinic, area, supported postal area, languages, or phone", "Evidence needs a valid date within the last 14 days and expiry window"], ["K1Y"]);
  assert.match(g.todo[0].text, /taking new patients/);
  assert.equal(g.todo[1].label, "fill in area, postal area, phone", "an empty notice names no language, so languages may stay empty");
  assert.ok(g.todo.some((t) => t.label === "date"));
  assert.deepEqual([...g.flagged].sort(), ["area", "date", "fsa", "phone"]);
  assert.ok(!g.flagged.has("clinic") && !g.flagged.has("providerType"));
});

test("review guide: a filled but uncertain field is 'check', not 'fill in'", () => {
  const g = reviewGuide(listing({ area: "Centretown", fsa: "K1Y", languages: ["English"], phone: "613-555-0100", confidence: { accepting: "yes", location: "medium", provider_type: "high", provider_type_read: "family_doctor", languages: "high", date: "high", date_read: "2026-11-10" } }), ["Extraction contains uncertainty"], ["K1Y"]);
  assert.deepEqual(g.todo.map((t) => t.label), ["check area, postal area"]);
});

test("notice marks: new-patient wording, phone numbers and the clinic name", () => {
  const parts = noticeMarks("Openfield Medical Centre is accepting new patients. Call 613-555-0100.", "Openfield Medical Centre");
  assert.deepEqual(parts.filter((p) => p.mark).map((p) => p.t), ["Openfield Medical Centre", "accepting new patients", "613-555-0100"]);
  assert.equal(parts.map((p) => p.t).join(""), "Openfield Medical Centre is accepting new patients. Call 613-555-0100.");
});
