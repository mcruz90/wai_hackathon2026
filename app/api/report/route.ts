import { NextResponse } from "next/server";
import { FULL_REPORTS_TO_HIDE } from "@/lib/config";
import { bump } from "@/lib/counts";
import { prisma } from "@/lib/db";
import { asLang, EN_NAME } from "@/lib/i18n";
import { expiryFrom, liveWhere } from "@/lib/listings";
import { dailyToken, rateLimit } from "@/lib/token";

/**
 * A patient reports what the clinic said on the phone.
 *  open: the listing's last-confirmed date becomes today.
 *  full: recorded against a hashed daily token. After 2 separate reports the listing is hidden.
 *  lang: whether the clinic spoke the patient's language, offered an interpreter, or neither. Recorded against the
 *        same hashed daily token, once per listing and language. It never changes the listing's own language list;
 *        a reported language is shown, labelled as a patient report, once 2 separate reports agree.
 * Rate limited per daily token. No address is stored.
 */
export async function POST(req: Request) {
  const token = dailyToken(req);
  if (!rateLimit(`report|${token}`, 10, 36e5)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  if (!body || typeof body.listingId !== "string" || (kind !== "open" && kind !== "full" && kind !== "lang")) return NextResponse.json({ ok: false }, { status: 400 });
  const outcome = body.outcome;
  if (kind === "lang" && (outcome !== "spoke" && outcome !== "interpreter" && outcome !== "neither" || asLang(body.lang) === "en")) return NextResponse.json({ ok: false }, { status: 400 });
  const listing = await prisma.listing.findFirst({ where: { id: body.listingId, ...liveWhere() } });
  if (!listing) return NextResponse.json({ ok: true, hidden: true });

  if (kind === "lang") {
    await prisma.languageReport.createMany({ data: [{ listingId: listing.id, language: EN_NAME[asLang(body.lang)], outcome, tokenHash: token }], skipDuplicates: true });
    return NextResponse.json({ ok: true, hidden: false });
  }

  if (kind === "open") {
    const now = new Date();
    await prisma.listing.update({ where: { id: listing.id }, data: { lastConfirmedAt: now, expiresAt: expiryFrom(now) } });
    return NextResponse.json({ ok: true, hidden: false });
  }

  const before = await prisma.fullReport.count({ where: { listingId: listing.id } });
  await prisma.fullReport.createMany({ data: [{ listingId: listing.id, tokenHash: token }], skipDuplicates: true });
  const reports = await prisma.fullReport.count({ where: { listingId: listing.id } });
  if (reports > before) await bump(String(body.fsa || ""), asLang(body.lang), ["fullReports"]);
  const hidden = reports >= FULL_REPORTS_TO_HIDE;
  if (hidden) await prisma.listing.update({ where: { id: listing.id }, data: { status: "full" } });
  return NextResponse.json({ ok: true, hidden });
}
