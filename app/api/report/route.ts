import { after, NextResponse } from "next/server";
import { followUpPatientReport } from "@/lib/agent/freshness";
import { fullReportsToHide } from "@/lib/config";
import { bump } from "@/lib/counts";
import { prisma } from "@/lib/db";
import { asLang, EN_NAME } from "@/lib/i18n";
import { expiryFrom, liveWhere } from "@/lib/listings";
import { dailyToken, rateLimit } from "@/lib/token";

/**
 * A patient reports what the clinic said on the phone.
 *  open: the listing's last-confirmed date becomes today.
 *  full: recorded against a hashed daily token. After FULL_REPORTS_TO_HIDE separate reports (default 2) the listing is hidden.
 *        Either way, the freshness agent then runs for this listing and asks a reviewer to call the clinic.
 *  lang: whether the clinic spoke the patient's language, offered an interpreter, or neither. Recorded against the
 *        same hashed daily token, once per listing and language. It never changes the listing's own language list;
 *        a reported language is shown, labelled as a patient report, once 2 separate reports agree. A "neither" report
 *        also starts the freshness agent for this listing, so a reviewer asks the clinic about languages.
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
    const language = EN_NAME[asLang(body.lang)];
    const added = await prisma.languageReport.createMany({ data: [{ listingId: listing.id, language, outcome, tokenHash: token }], skipDuplicates: true });
    if (added.count && outcome === "neither") after(() => followUpPatientReport({ listingId: listing.id, trigger: "patient_language",
      report: `A patient who speaks ${language} called and said nobody spoke ${language} and no interpreter was offered.` }));
    return NextResponse.json({ ok: true, hidden: false, recheck: added.count > 0 && outcome === "neither" });
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
  const hidden = reports >= fullReportsToHide();
  if (hidden) await prisma.listing.update({ where: { id: listing.id }, data: { status: "full" } });
  if (reports > before) after(() => followUpPatientReport({ listingId: listing.id, trigger: "patient_full",
    report: `A patient called and was told the clinic is full (${reports} separate report${reports === 1 ? "" : "s"}${hidden ? "; the listing is now hidden from patients" : ""}).` }));
  return NextResponse.json({ ok: true, hidden, recheck: reports > before });
}
