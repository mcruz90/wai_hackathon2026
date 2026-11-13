import test from "node:test";
import assert from "node:assert/strict";
import { contactCandidates } from "../lib/agent/contacts";
import { intakeTools } from "../lib/agent/intake";
import { contactBlock, parsePage } from "../lib/discovery/web";
import type { Extraction } from "../lib/extract";

const PAGE = "We are accepting new patients. Ongoing family medicine for your family.";
const FOOTER = "Openfield Medical Centre\n1200 Main Street\nLondon, ON N6H 0G6\nTel: 519-555-0199\nProvincial line: 1-866-797-0007";

test("contact candidates list every postal code, phone and place, without toll-free lines", () => {
  const c = contactCandidates(FOOTER);
  assert.deepEqual(c.postal_areas.map((p) => [p.value, p.supported]), [["N6H", true]]);
  assert.deepEqual(c.phones.map((p) => p.value), ["519-555-0199"]);
  assert.deepEqual(c.places.map((p) => p.value), ["London"]);
  assert.match(c.phones[0].context, /Tel: 519-555-0199/);
});

test("the excerpt gets the footer's address and phone back when the 6000-character cut removed them", () => {
  const html = `<html><body><header><nav><a href="tel:+15195550199">Call us</a></nav></header><main><p>${PAGE}</p>${"<p>About our team and services.</p>".repeat(400)}</main><footer><address>${FOOTER.replaceAll("\n", "<br>")}</address></footer></body></html>`;
  const p = parsePage(html, "https://openfield.example/");
  assert.match(p.excerpt, /\[Contact details elsewhere on the same page\]/);
  assert.match(p.excerpt, /London, ON N6H 0G6/);
  assert.match(p.excerpt, /1200 Main Street/, "the street line before the postal code comes too");
  assert.match(p.excerpt, /519-555-0199/);
  assert.equal(contactBlock(FOOTER, FOOTER), "", "nothing is added when the excerpt already has it");
});

const tool = (name: string) => intakeTools.find((t) => t.name === name)!;
const extraction = (over: Partial<Extraction> = {}): Extraction => ({ clinic: "Openfield Medical Centre", area: null, fsa: null, provider_type: "family_doctor", languages: [], date: null, accepting: "yes", phone: null,
  confidence: { location: "low", provider_type: "high", languages: "low", date: "low" }, notes: "Area and phone not stated.", ...over });
// The fill tool never touches the database.
const ctxFor = (text: string, x = extraction()) => ({ text, extraction: x, filled: [] as string[] }) as unknown as Parameters<(typeof intakeTools)[number]["run"]>[1];

test("fill_missing_fields fills empty fields only from values in the text, and records which", async () => {
  const ctx = ctxFor(`${PAGE}\n\n${FOOTER}`);
  const r = (await tool("fill_missing_fields").run({ area: "London", fsa: "n6h", phone: "(519) 555-0199", confidence: "high", notes: "" }, ctx)) as { filled: string[]; refused: string[] };
  assert.deepEqual(r.filled, ["area", "postal area", "phone"]);
  const x = (ctx as unknown as { extraction: Extraction; filled: string[] });
  assert.equal(x.extraction.fsa, "N6H"); assert.equal(x.extraction.phone, "519-555-0199"); assert.equal(x.extraction.confidence.location, "high");
  assert.equal(x.extraction.notes, "", "the model's remaining doubt replaces the old note");
  assert.deepEqual(x.filled, ["area", "postal area", "phone"]);
});

test("fill_missing_fields refuses invented values, keeps fields already read, and caps confidence when there are several addresses", async () => {
  const two = `${PAGE}\n\n${FOOTER}\nSecond site: Ottawa, ON K1S 1A1`;
  const ctx = ctxFor(two, extraction({ phone: "613-555-0100" }));
  const r = (await tool("fill_missing_fields").run({ area: "Toronto", fsa: "M5V", phone: "519-555-0199", confidence: "high", notes: "" }, ctx)) as { filled: string[]; refused: string[] };
  assert.deepEqual(r.filled, []);
  assert.equal(r.refused.length, 2, "Toronto and M5V are not in the text");
  assert.equal((ctx as unknown as { extraction: Extraction }).extraction.phone, "613-555-0100", "a phone already read is not replaced");
  const ok = (await tool("fill_missing_fields").run({ area: "London", fsa: "N6H", phone: null, confidence: "high", notes: "" }, ctx)) as { now: { location_confidence: string } };
  assert.equal(ok.now.location_confidence, "medium", "two addresses on the page: the choice is never high");
});
