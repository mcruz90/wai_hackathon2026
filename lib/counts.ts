import { prisma } from "./db";
import { cleanFsa } from "./fsa";
import { LANGS } from "./i18n";

type Counter = "searches" | "searchesNoLangMatch" | "listingOpens" | "fullReports";

/** Adds to today's counters for one postal area and language. Nothing else about the visit is kept. */
export async function bump(fsaInput: string, language: string, counters: Counter[]): Promise<void> {
  const fsa = cleanFsa(fsaInput);
  if (!/^[A-Z]\d[A-Z]$/.test(fsa) || !(LANGS as readonly string[]).includes(language) || !counters.length) return;
  const date = new Date(new Date().toISOString().slice(0, 10));
  const inc = Object.fromEntries(counters.map((c) => [c, { increment: 1 }]));
  const init = Object.fromEntries(counters.map((c) => [c, 1]));
  await prisma.dailyCount.upsert({
    where: { date_fsa_language_isSample: { date, fsa, language, isSample: false } },
    create: { date, fsa, language, isSample: false, ...init },
    update: inc,
  });
}
