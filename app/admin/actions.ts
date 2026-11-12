"use server";
import { Prisma } from "@prisma/client";
import { parseReviewSelection, publishReviewBatch, ReviewError, reviewInclude } from "@/lib/batch-review";
import { evidenceDate, reviewSnapshot, reviewVersion } from "@/lib/review-policy";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, requireAdmin, safeEqual } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expireListings } from "@/lib/expiry";
import { ExtractionError, needsReview, type Extraction } from "@/lib/extract";
import { runFreshnessAgent } from "@/lib/agent/freshness";
import { runIntakeAgent } from "@/lib/agent/intake";
import { AgentError } from "@/lib/agent/runtime";
import { cleanFsa, DOWNTOWN } from "@/lib/fsa";
import { expiryFrom } from "@/lib/listings";
import { adminCookieValue } from "@/lib/token";
import { respondToOffer, runWaitlistJob, simulateOpening } from "@/lib/waitlist";

const SOURCE_TYPES = ["web", "post", "list", "news", "rev"];
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const go = (path: string, key: "msg" | "error", text: string): never => redirect(`${path}?${key}=${encodeURIComponent(text)}`);

export async function login(form: FormData) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const next = str(form, "next");
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  if (!expected || !safeEqual(str(form, "password"), expected)) redirect(`/admin/login?error=1&next=${encodeURIComponent(dest)}`);
  (await cookies()).set(ADMIN_COOKIE, adminCookieValue(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  redirect(dest);
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/** Paste-only intake: one announcement in, one proposal out (from the intake agent). Nothing is published here. */
export async function intake(form: FormData) {
  await requireAdmin();
  const text = str(form, "text"), sourceUrl = str(form, "sourceUrl"), sourceType = str(form, "sourceType");
  if (text.length < 20) go("/admin", "error", "Paste the announcement text first.");
  if (text.length > 6000) go("/admin", "error", "That announcement is too long. Paste only the announcement itself (6,000 characters at most).");
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) go("/admin", "error", "The source link must start with http:// or https://");
  let outcome;
  try { outcome = await runIntakeAgent({ text, sourceUrl: sourceUrl || null, sourceType }); }
  catch (err) { return go("/admin", "error", err instanceof ExtractionError || err instanceof AgentError ? err.message : "The intake agent did not work. Try again."); }
  revalidatePath("/admin");
  go("/admin", "msg", outcome.kind === "listing"
    ? "The intake agent read the announcement and found no existing listing. Check the new listing in the review queue below."
    : "The intake agent made a proposal about an existing listing or about not listing this. Check it under Agent proposals below.");
}

/** The reviewer authorizes exactly the selected versions; no agent can call this action. */
export async function approveBatch(form: FormData): Promise<void> {
  await requireAdmin();
  if (str(form, "authorize") !== "yes") go("/admin", "error", "Authorize the selected batch before publishing.");
  let count = 0;
  try {
    const selection = parseReviewSelection(form.getAll("selection"));
    await publishReviewBatch(prisma, selection);
    count = selection.length;
  } catch (error) {
    if (error instanceof ReviewError) return go("/admin", "error", error.message);
    throw error;
  }
  revalidatePath("/admin");
  go("/admin", "msg", `Published ${count} selected listings. Their evidence dates were preserved and the batch decision was recorded.`);
}

/** Re-confirm a listing as of a date: it goes live again with a fresh expiry, and old "full" reports are cleared. */
async function reconfirm(listingId: string, date: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? date : today;
  const confirmed = new Date(Math.min(Date.now(), new Date(`${d}T17:00:00Z`).getTime()));
  const expiresAt = expiryFrom(confirmed);
  await prisma.$transaction([
    prisma.fullReport.deleteMany({ where: { listingId } }),
    prisma.listing.update({ where: { id: listingId }, data: { status: expiresAt > new Date() ? "live" : "expired", lastConfirmedAt: confirmed, expiresAt } }),
  ]);
  return { d, live: expiresAt > new Date() };
}

/**
 * A reviewer decides on an agent proposal. This is the only place a proposal changes a listing.
 * decision: approve | reject for intake proposals; still_open | full | reject for re-checks;
 * review_as_new to override a "no listing" recommendation.
 */
async function decideProposal(form: FormData, decision: string) {
  await requireAdmin();
  const id = str(form, "id");
  const p = await prisma.agentProposal.findFirst({ where: { id, status: "pending" }, include: { listing: true } });
  if (!p) return go("/admin", "error", "That proposal is no longer waiting for a decision.");
  const done = (status: "approved" | "rejected") => prisma.agentProposal.update({ where: { id }, data: { status, decidedAt: new Date() } });
  const name = p.listing?.clinic ?? "the listing";
  let msg = "";
  if (decision === "reject") { await done("rejected"); msg = "Proposal rejected. Nothing changed."; }
  else if ((p.action === "reconfirm_listing" && decision === "approve") || (p.action === "recheck_listing" && decision === "still_open")) {
    if (!p.listingId) return go("/admin", "error", "That proposal has no listing.");
    const date = p.action === "reconfirm_listing" ? str(form, "date") : new Date().toISOString().slice(0, 10);
    if (!evidenceDate(date, new Date())) return go("/admin", "error", "Enter a valid evidence or clinic confirmation date. Approval alone does not confirm availability today.");
    const r = await reconfirm(p.listingId, date);
    // On a clinic call the reviewer can record the languages the clinic gave; an empty field keeps the current list.
    const told = p.action === "recheck_listing" ? [...new Set(str(form, "languages").split(",").map((s) => s.trim()).filter(Boolean))] : [];
    if (told.length) await prisma.listing.update({ where: { id: p.listingId }, data: { languages: told } });
    await done("approved");
    msg = r.live ? `Re-confirmed ${name} as of ${r.d}. It shows to patients with a fresh expiry date.` : `Saved ${name} as confirmed on ${r.d}, but that is past the expiry window, so patients will not see it.`;
  } else if ((p.action === "mark_full" && decision === "approve") || (p.action === "recheck_listing" && decision === "full")) {
    if (!p.listingId) return go("/admin", "error", "That proposal has no listing.");
    await prisma.listing.update({ where: { id: p.listingId }, data: { status: "full" } });
    await done("approved");
    msg = `Marked ${name} as full. Patients no longer see it.`;
  } else if (p.action === "no_listing" && decision === "approve") {
    await done("approved"); msg = "Confirmed: not listed. Nothing was published.";
  } else if (p.action === "no_listing" && decision === "review_as_new") {
    const pl = (p.payload ?? {}) as { extraction?: Extraction; source_url?: string | null; source_type?: string };
    const x = pl.extraction;
    if (!x) return go("/admin", "error", "That proposal has no reading to review.");
    const centroid = x.fsa ? await prisma.fsaCentroid.findUnique({ where: { fsa: x.fsa } }) : null;
    await prisma.listing.create({
      data: {
        clinic: x.clinic ?? "", area: x.area ?? "", fsa: centroid?.fsa ?? null, lat: centroid?.lat ?? DOWNTOWN[0], lng: centroid?.lng ?? DOWNTOWN[1],
        providerType: x.provider_type === "nurse_practitioner" ? "nurse_practitioner" : "family_doctor", languages: x.languages, phone: x.phone,
        sourceType: SOURCE_TYPES.includes(pl.source_type ?? "") ? pl.source_type! : "rev", sourceUrl: pl.source_url ?? null, rawText: p.rawText, status: "pending",
        confidence: { ...x.confidence, provider_type_read: x.provider_type, accepting: x.accepting, date_read: x.date, notes: x.notes, needs_review: needsReview(x), agent_rationale: `Reviewer overrode the agent's "no listing" recommendation: ${p.rationale}`, agent_trace: p.trace as object },
      },
    });
    await done("rejected");
    msg = "Moved to the review queue as a new listing. Check every field before publishing.";
  } else return go("/admin", "error", "That decision does not apply to this proposal.");
  revalidatePath("/admin");
  go("/admin", "msg", msg);
}

// One server action per button, so the decision never depends on which button the browser reports.
export async function proposalApprove(form: FormData) { return decideProposal(form, "approve"); }
export async function proposalReject(form: FormData) { return decideProposal(form, "reject"); }
export async function proposalStillOpen(form: FormData) { return decideProposal(form, "still_open"); }
export async function proposalFull(form: FormData) { return decideProposal(form, "full"); }
export async function proposalReviewAsNew(form: FormData) { return decideProposal(form, "review_as_new"); }

export async function runFreshness() {
  await requireAdmin();
  let r;
  try { r = await runFreshnessAgent(); }
  catch (err) { return go("/admin", "error", err instanceof AgentError ? err.message : "The freshness agent did not work. Try again."); }
  revalidatePath("/admin");
  go("/admin", "msg", `Freshness agent ran. ${r.summary}`);
}

/** Individual publication remains available for exceptions and corrections. */
export async function approve(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const fsa = cleanFsa(str(form, "fsa"));
  const centroid = await prisma.fsaCentroid.findUnique({ where: { fsa } });
  const date = str(form, "date"), providerType = str(form, "providerType");
  const languages = [...new Set(str(form, "languages").split(",").map((s) => s.trim()).filter(Boolean))];
  const clinic = str(form, "clinic"), area = str(form, "area"), sourceUrl = str(form, "sourceUrl");
  const problems = [
    !clinic && "clinic name", !area && "area", !centroid && "postal area",
    providerType !== "family_doctor" && providerType !== "nurse_practitioner" && "provider type",
    !evidenceDate(date, new Date()) && "valid evidence date",
  ].filter(Boolean);
  if (problems.length) go("/admin", "error", `Not published. Fill in: ${problems.join(", ")}.`);
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) go("/admin", "error", "Not published. The confirmed date cannot be in the future.");
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) go("/admin", "error", "The source link must start with http:// or https://");
  // Noon Toronto time on the confirmed date, or now if that is later than now.
  const confirmed = new Date(Math.min(Date.now(), new Date(`${date}T17:00:00Z`).getTime()));
  const expiresAt = expiryFrom(confirmed);
  let count = 0;
  try {
    count = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id }, include: reviewInclude });
      if (!listing || listing.status !== "pending" || reviewVersion(listing) !== str(form, "version")) throw new ReviewError("That listing changed. Reload and review it again before publishing.");
      const data = {
        clinic, area, fsa, lat: centroid!.lat, lng: centroid!.lng, providerType: providerType as "family_doctor" | "nurse_practitioner",
        languages, phone: str(form, "phone") || null, sourceType: SOURCE_TYPES.includes(str(form, "sourceType")) ? str(form, "sourceType") : "rev",
        sourceUrl: sourceUrl || null, status: expiresAt > new Date() ? "live" as const : "expired" as const, lastConfirmedAt: confirmed, expiresAt,
      };
      const result = await tx.listing.updateMany({ where: { id, status: "pending" }, data });
      if (result.count !== 1) throw new ReviewError("That listing is no longer waiting for review.");
      await tx.reviewDecision.create({ data: { mode: "individual", action: "publish", policy: "individual-review-v1",
        items: { listings: [{ listingId: id, version: reviewVersion(listing), before: reviewSnapshot(listing),
          after: { ...data, lastConfirmedAt: confirmed.toISOString(), expiresAt: expiresAt.toISOString() } }] } as Prisma.InputJsonObject } });
      return result.count;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof ReviewError) return go("/admin", "error", error.message);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return go("/admin", "error", "The queue changed. Reload and review again before publishing.");
    throw error;
  }
  revalidatePath("/admin");
  if (!count) go("/admin", "error", "That listing is no longer waiting for review.");
  go("/admin", "msg", expiresAt > new Date() ? `Published ${clinic}. It now shows in patient results near ${fsa}.` : `Saved ${clinic}, but the confirmed date is already past the expiry window, so patients will not see it.`);
}

export async function reject(form: FormData) {
  await requireAdmin();
  const listing = await prisma.listing.findUnique({ where: { id: str(form, "id") }, include: reviewInclude });
  if (!listing || listing.status !== "pending" || reviewVersion(listing) !== str(form, "version")) return go("/admin", "error", "That listing changed. Reload and review it again.");
  await prisma.listing.deleteMany({ where: { id: listing.id, status: "pending" } });
  revalidatePath("/admin");
  go("/admin", "msg", "Rejected and deleted.");
}

export async function runExpiry() {
  await requireAdmin();
  const names = await expireListings();
  revalidatePath("/admin");
  go("/admin", "msg", names.length ? `Expiry job ran. Expired: ${names.join("; ")}.` : "Expiry job ran. Nothing was past its date.");
}

// ---- waitlist concept (sample rows only) ----
export async function openSpot(form: FormData) {
  await requireAdmin("/admin/waitlist");
  const r = await simulateOpening(str(form, "listingId"));
  revalidatePath("/admin/waitlist");
  go("/admin/waitlist", r.offered ? "msg" : "error", r.alreadyOpen ? "That clinic already has an open offer round. Finish it first."
    : r.offered ? `Offered the spot to ${r.offered} sample ${r.offered === 1 ? "entry" : "entries"}. See the outbox.` : "No sample entry is waiting within range of that clinic.");
}

export async function answerOffer(form: FormData) {
  await requireAdmin("/admin/waitlist");
  const response = str(form, "response");
  if (response === "accepted" || response === "passed" || response === "no_reply") await respondToOffer(str(form, "offerId"), response);
  revalidatePath("/admin/waitlist");
  go("/admin/waitlist", "msg", response === "accepted" ? "Accepted. The opening is closed." : response === "passed" ? "Passed. The offer moved to the next person." : "Reply window ended. The offer moved to the next person.");
}

export async function runWaitlist() {
  await requireAdmin("/admin/waitlist");
  const r = await runWaitlistJob();
  revalidatePath("/admin/waitlist");
  go("/admin/waitlist", "msg", `Check-in job ran: ${r.reminders} reminders, ${r.expired} reply windows closed, ${r.checkins} check-ins written to the outbox.`);
}
