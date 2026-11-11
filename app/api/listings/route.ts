import { NextResponse } from "next/server";
import { T } from "@/lib/i18n";
import { parseSearch, rankedListings } from "@/lib/listings";

export const dynamic = "force-dynamic";

/** Ranked live listings for a search. Read-only and uncounted; the plan screen uses it. */
export async function GET(req: Request) {
  const s = parseSearch(Object.fromEntries(new URL(req.url).searchParams));
  const { listings } = await rankedListings(s, T[s.lang].match);
  return NextResponse.json({ listings }, { headers: { "cache-control": "no-store" } });
}
