import { FSA_CODES } from "../fsa";

/**
 * Contact details written in a notice, found by pattern, for the intake agent's find_contact_details tool. The pattern
 * only lists candidates with a little surrounding text; the model decides which (if any) belong to the clinic, and
 * fill_missing_fields accepts only values from this list. So nothing here is inferred, and nothing is chosen blindly.
 */
export type Candidate = { value: string; context: string };
export type ContactCandidates = { postal_areas: (Candidate & { supported: boolean })[]; phones: Candidate[]; places: Candidate[] };

const around = (text: string, i: number, len: number) => text.slice(Math.max(0, i - 60), i + len + 60).replace(/\s+/g, " ").trim();
function collect(text: string, re: RegExp, key: (m: RegExpMatchArray) => string): Candidate[] {
  const seen = new Map<string, Candidate>();
  for (const m of text.matchAll(re)) { const v = key(m); if (!seen.has(v)) seen.set(v, { value: v, context: around(text, m.index ?? 0, m[0].length) }); }
  return [...seen.values()].slice(0, 8);
}

export function contactCandidates(text: string): ContactCandidates {
  const postal_areas = collect(text, /(?<![A-Za-z0-9])([KLMNP]\d[A-Z]) ?\d[A-Z]\d(?![A-Za-z0-9])/gi, (m) => m[1].toUpperCase())
    .map((c) => ({ ...c, supported: FSA_CODES.includes(c.value) }));
  // Toll-free numbers are usually a head office or a provincial line, not the clinic's own phone.
  const phones = collect(text, /(?<!\d)\(?([2-9]\d{2})\)?[-. ]?(\d{3})[-. ](\d{4})(?!\d)/g, (m) => `${m[1]}-${m[2]}-${m[3]}`)
    .filter((c) => !/^8(00|33|44|55|66|77|88)-/.test(c.value));
  const places = collect(text, /([A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){0,2}),? (?:ON|Ontario)\b\.?,? ?(?:[KLMNP]\d[A-Z])?/g, (m) => m[1])
    .filter((c) => !/^(Ontario|Canada|ON)$/.test(c.value));
  return { postal_areas, phones, places };
}

/** Digits only, without a leading 1, for comparing phone numbers written differently. */
export const phoneDigits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
