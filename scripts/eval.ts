/**
 * npm run eval                              (real announcements: eval/announcements.jsonl)
 * npm run eval -- eval/synthetic.jsonl      (any other file of examples)
 * Scores the extraction module field by field and writes eval/results.md
 * (or <name>-results.md for another file) with accuracy and every mistake.
 */
import "./env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractListing, type Extraction } from "../lib/extract";

type Example = { id: string; today?: string; text: string; expected: { fsa: string | null; provider_type: string; languages: string[]; date: string | null } };
const FIELDS = ["location", "provider_type", "languages", "date"] as const;
type Field = (typeof FIELDS)[number];

const dir = path.join(process.cwd(), "eval");
const inputFile = process.argv[2] ? path.resolve(process.argv[2]) : path.join(dir, "announcements.jsonl");
const base = path.basename(inputFile, ".jsonl");
const resultsFile = path.join(dir, base === "announcements" ? "results.md" : `${base}-results.md`);
const examples: Example[] = readFileSync(inputFile, "utf8")
  .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//")).map((l) => JSON.parse(l));

const langSet = (a: string[]) => [...new Set(a.map((s) => s.trim().toLowerCase()))].sort().join(", ");
const show = (v: unknown) => (v === null || v === undefined ? "null" : Array.isArray(v) ? v.join(", ") || "(none)" : String(v));

function compare(ex: Example, got: Extraction): Record<Field, { ok: boolean; expected: string; got: string }> {
  return {
    location: { ok: (ex.expected.fsa ?? null) === got.fsa, expected: show(ex.expected.fsa), got: show(got.fsa) },
    provider_type: { ok: ex.expected.provider_type === got.provider_type, expected: ex.expected.provider_type, got: got.provider_type },
    languages: { ok: langSet(ex.expected.languages) === langSet(got.languages), expected: show(ex.expected.languages), got: show(got.languages) },
    date: { ok: (ex.expected.date ?? null) === got.date, expected: show(ex.expected.date), got: show(got.date) },
  };
}

async function main() {
  const correct: Record<Field, number> = { location: 0, provider_type: 0, languages: 0, date: 0 };
  const mistakes: string[] = [];
  const failures: string[] = [];
  let scored = 0;
  for (const ex of examples) {
    process.stdout.write(`${ex.id} ... `);
    try {
      const got = await extractListing(ex.text, { today: ex.today });
      const cmp = compare(ex, got);
      scored++;
      for (const f of FIELDS) {
        if (cmp[f].ok) correct[f]++;
        else mistakes.push(`| ${ex.id} | ${f} | ${cmp[f].expected} | ${cmp[f].got} | ${got.confidence[f]} |`);
      }
      console.log(FIELDS.map((f) => (cmp[f].ok ? "ok" : `${f} WRONG`)).join(" "));
    } catch (err) {
      failures.push(`- ${ex.id}: ${(err as Error).message}`);
      console.log("FAILED", (err as Error).message);
    }
  }
  const pct = (n: number) => (scored ? `${Math.round((100 * n) / scored)}%` : "n/a");
  const provider = process.env.LLM_PROVIDER || "anthropic";
  const model = provider === "mock" ? "offline keyword reader (not AI)" : process.env.LLM_MODEL || "(provider default)";
  const out = [
    "# Extraction evaluation",
    "",
    `Run: ${new Date().toISOString()}  `,
    `Provider: ${provider}  `,
    `Model: ${model}  `,
    `File: ${path.relative(process.cwd(), inputFile)}  `,
    `Announcements: ${examples.length} in the file, ${scored} scored, ${failures.length} failed to run`,
    "",
    "## Accuracy by field",
    "",
    "| Field | Correct | Accuracy |",
    "| --- | --- | --- |",
    ...FIELDS.map((f) => `| ${f} | ${correct[f]} of ${scored} | ${pct(correct[f])} |`),
    "",
    "Location is scored on the postal area (first 3 characters). Languages must match as a set. A null label means the right answer is to return null.",
    "",
    "## Mistakes",
    "",
    ...(mistakes.length ? ["| Announcement | Field | Expected | Got | Model confidence |", "| --- | --- | --- | --- | --- |", ...mistakes] : ["None."]),
    "",
    ...(failures.length ? ["## Announcements that failed to run", "", ...failures, ""] : []),
  ].join("\n");
  writeFileSync(resultsFile, out);
  console.log(`\nWrote ${path.relative(process.cwd(), resultsFile)} (${mistakes.length} mistakes, ${failures.length} failures)`);
  if (failures.length === examples.length) process.exit(1);
}
main();
