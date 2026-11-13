import { NextResponse } from "next/server";
import { dailyToken, rateLimit } from "@/lib/token";
import { CLINIC_TEXT_MAX, cleanLanguage, numbersMatch, translateClinicText, TranslationError } from "@/lib/translate";

/**
 * Clinic staff type an instruction in English; it comes back in the patient's language.
 * Nothing is stored. Rate limited per daily token and in total (lib/translate.ts).
 * numbersOk is false when the translation's numbers differ from the English, so the page can warn.
 */
export async function POST(req: Request) {
  if (!rateLimit(`clinic-say|${dailyToken(req)}`, 20, 36e5)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => null);
  const language = cleanLanguage(body?.language);
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  if (!language || !text || text.length > CLINIC_TEXT_MAX) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const translated = await translateClinicText(language, text);
    return NextResponse.json({ ok: true, text: translated, numbersOk: numbersMatch(text, translated) });
  } catch (e) {
    console.error("clinic translation failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: e instanceof TranslationError ? 503 : 500 });
  }
}
