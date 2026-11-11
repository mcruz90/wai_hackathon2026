import { NextResponse } from "next/server";
import { bump } from "@/lib/counts";
import { asLang, T } from "@/lib/i18n";
import { noLanguageMatchNearby, parseSearch, rankedListings } from "@/lib/listings";
import { dailyToken, rateLimit } from "@/lib/token";

/** Anonymous counters. The body carries a postal area and a language, nothing that identifies a person, and nothing is logged. */
export async function POST(req: Request) {
  if (!rateLimit(`track|${dailyToken(req)}`, 120, 36e5)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false }, { status: 400 });
  const lang = asLang(body.lang);
  if (body.event === "search") {
    const s = parseSearch({ fsa: String(body.fsa || ""), lang, type: String(body.type || "") });
    const { listings } = await rankedListings(s, T[lang].match);
    await bump(s.fsa, lang, noLanguageMatchNearby(listings) ? ["searches", "searchesNoLangMatch"] : ["searches"]);
  } else if (body.event === "open") {
    await bump(String(body.fsa || ""), lang, ["listingOpens"]);
  } else return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
