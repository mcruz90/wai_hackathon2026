import { NextResponse } from "next/server";
import { FULL_REPORTS_TO_HIDE } from "@/lib/config";
import { bump } from "@/lib/counts";
import { prisma } from "@/lib/db";
import { asLang } from "@/lib/i18n";
import { expiryFrom, liveWhere } from "@/lib/listings";
import { dailyToken, rateLimit } from "@/lib/token";

/**
 * A patient reports what the clinic said on the phone.
 *  open: the listing's last-confirmed date becomes today.
 *  full: recorded against a hashed daily token. After 2 separate reports the listing is hidden.
 * Rate limited per daily token. No address is stored.
 */
export async function POST(req: Request) {
  const token = dailyToken(req);
  if (!rateLimit(`report|${token}`, 10, 36e5)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  if (!body || typeof body.listingId !== "string" || (kind !== "open" && kind !== "full")) return NextResponse.json({ ok: false }, { status: 400 });
  const listing = await prisma.listing.findFirst({ where: { id: body.listingId, ...liveWhere() } });
  if (!listing) return NextResponse.json({ ok: true, hidden: true });

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
