"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, requireAdmin, safeEqual } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expireListings } from "@/lib/expiry";
import { extractListing, ExtractionError, needsReview } from "@/lib/extract";
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

/** Paste-only intake: one announcement in, one pending listing out. Nothing is published here. */
export async function intake(form: FormData) {
  await requireAdmin();
  const text = str(form, "text"), sourceUrl = str(form, "sourceUrl"), sourceType = str(form, "sourceType");
  if (text.length < 20) go("/admin", "error", "Paste the announcement text first.");
  if (text.length > 6000) go("/admin", "error", "That announcement is too long. Paste only the announcement itself (6,000 characters at most).");
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) go("/admin", "error", "The source link must start with http:// or https://");
  let x;
  try { x = await extractListing(text); }
  catch (err) { return go("/admin", "error", err instanceof ExtractionError ? err.message : "The extraction did not work. Try again."); }
  const centroid = x.fsa ? await prisma.fsaCentroid.findUnique({ where: { fsa: x.fsa } }) : null;
  await prisma.listing.create({
    data: {
      clinic: x.clinic ?? "", area: x.area ?? "", fsa: centroid?.fsa ?? null, lat: centroid?.lat ?? DOWNTOWN[0], lng: centroid?.lng ?? DOWNTOWN[1],
      providerType: x.provider_type === "nurse_practitioner" ? "nurse_practitioner" : "family_doctor",
      languages: x.languages, phone: x.phone, sourceType: SOURCE_TYPES.includes(sourceType) ? sourceType : "rev", sourceUrl: sourceUrl || null,
      rawText: text, status: "pending",
      confidence: { ...x.confidence, provider_type_read: x.provider_type, accepting: x.accepting, date_read: x.date, notes: x.notes, needs_review: needsReview(x) },
    },
  });
  revalidatePath("/admin");
  go("/admin", "msg", "Announcement read. Check it in the review queue below.");
}

/** A reviewer confirms every field and the date. This is the only way a listing becomes live. */
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
    !languages.length && "languages", !/^\d{4}-\d{2}-\d{2}$/.test(date) && "confirmed date",
  ].filter(Boolean);
  if (problems.length) go("/admin", "error", `Not published. Fill in: ${problems.join(", ")}.`);
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) go("/admin", "error", "Not published. The confirmed date cannot be in the future.");
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) go("/admin", "error", "The source link must start with http:// or https://");
  // Noon Toronto time on the confirmed date, or now if that is later than now.
  const confirmed = new Date(Math.min(Date.now(), new Date(`${date}T17:00:00Z`).getTime()));
  const expiresAt = expiryFrom(confirmed);
  const pending = await prisma.listing.updateMany({
    where: { id, status: "pending" },
    data: {
      clinic, area, fsa, lat: centroid!.lat, lng: centroid!.lng, providerType: providerType as "family_doctor" | "nurse_practitioner",
      languages, phone: str(form, "phone") || null, sourceType: SOURCE_TYPES.includes(str(form, "sourceType")) ? str(form, "sourceType") : "rev",
      sourceUrl: sourceUrl || null, status: expiresAt > new Date() ? "live" : "expired", lastConfirmedAt: confirmed, expiresAt,
    },
  });
  revalidatePath("/admin");
  if (!pending.count) go("/admin", "error", "That listing is no longer waiting for review.");
  go("/admin", "msg", expiresAt > new Date() ? `Published ${clinic}. It now shows in patient results near ${fsa}.` : `Saved ${clinic}, but the confirmed date is already past the expiry window, so patients will not see it.`);
}

export async function reject(form: FormData) {
  await requireAdmin();
  await prisma.listing.deleteMany({ where: { id: str(form, "id"), status: "pending" } });
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
