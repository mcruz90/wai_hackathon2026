import { namesALanguage, phoneKey, sourceHost, type ReviewListing } from "./review-policy";

/**
 * Turns the batch checks for one pending listing into what a reviewer must do, in order of importance.
 * Each item has a short label for the collapsed card ("To check: …") and a full sentence for the open card.
 * `flagged` names the form fields to highlight, so the reviewer looks at those first.
 */
export type Field = "clinic" | "area" | "fsa" | "providerType" | "languages" | "phone" | "date" | "sourceUrl";
export type Todo = { label: string; text: string };
export type Guide = { todo: Todo[]; flagged: Set<Field>; missing: Set<Field> };

const NAMES: Record<Field, string> = { clinic: "clinic name", area: "area", fsa: "postal area", providerType: "provider type", languages: "languages", phone: "phone", date: "date", sourceUrl: "source link" };
const list = (fields: Field[]) => fields.map((f) => NAMES[f]).join(", ");

export function reviewGuide(l: ReviewListing, reasons: string[], fsas: string[]): Guide {
  const c = (l.confidence ?? {}) as Record<string, unknown>;
  const has = (start: string) => reasons.some((r) => r.startsWith(start));
  const missing: Field[] = [], unsure: Field[] = [];
  const mark = (f: Field, empty: boolean, conf?: unknown) => { if (empty) missing.push(f); else if (conf !== undefined && conf !== "high") unsure.push(f); };
  mark("clinic", !l.clinic.trim());
  mark("area", !l.area.trim(), c.location);
  mark("fsa", !l.fsa || !fsas.includes(l.fsa), c.location);
  mark("providerType", c.provider_type_read === "unknown" || !c.provider_type_read, c.provider_type_read !== l.providerType ? "low" : c.provider_type);
  // No languages and none named in the notice is allowed (patients are told to ask), so it is not flagged.
  if (l.languages.length || namesALanguage(l.rawText ?? "")) mark("languages", !l.languages.length, c.languages);
  mark("phone", phoneKey(l.phone).length !== 10);
  const badDate = has("Evidence needs a valid date");
  const badSource = has("No public HTTPS source link") || has("Source is not a configured clinic website");

  const todo: Todo[] = [];
  if (c.accepting !== "yes") todo.push({ label: "taking new patients?", text: `Confirm the notice says the clinic is taking new patients. The agent read: ${String(c.accepting ?? "unclear")}.` });
  if (has("Patient reports or pending proposals")) todo.push({ label: "patient reports", text: "Patients reported this clinic, or another proposal is open for it. Look at those first." });
  if (has("Possible duplicate")) todo.push({ label: "duplicate?", text: "Check that this clinic is not already listed. Another listing has a similar name or the same phone." });
  if (missing.length) todo.push({ label: `fill in ${list(missing)}`, text: `Fill in what the agent could not find: ${list(missing)}.` });
  if (unsure.length) todo.push({ label: `check ${list(unsure)}`, text: `Check the agent's guess against the notice: ${list(unsure)}.` });
  if (badDate) todo.push({ label: "date", text: c.date_read ? "The notice date is older than 14 days. Confirm with the clinic, then enter the date you checked." : "The notice has no date. Enter the date you checked it." });
  if (badSource) todo.push({ label: "source link", text: has("Source is not") ? "The source is not a clinic website marked as trusted. Check the link yourself." : "Add a public https:// link where patients can see the notice." });
  if (!todo.length && reasons.length) todo.push({ label: "compare with notice", text: "The notice wording does not match every field word for word. Compare each field with the notice." });

  const flagged = new Set<Field>([...missing, ...unsure]);
  if (badDate) flagged.add("date");
  if (badSource) flagged.add("sourceUrl");
  return { todo, flagged, missing: new Set(missing) };
}

/** Splits a notice into plain and marked parts: "new patients" wording, phone numbers, and the clinic's name. */
export function noticeMarks(text: string, clinic: string): { t: string; mark: boolean }[] {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const terms = [String.raw`(?:not |no longer )?(?:accepting|taking|welcoming) (?:new )?patients`, String.raw`new patients`, String.raw`\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b`];
  if (clinic.trim().length >= 4) terms.push(esc(clinic.trim()));
  const re = new RegExp(`(${terms.join("|")})`, "gi");
  // split() with one capture group alternates plain, match, plain, … so odd indexes are matches.
  return text.split(re).map((t, i) => ({ t, mark: i % 2 === 1 })).filter((p) => p.t);
}
