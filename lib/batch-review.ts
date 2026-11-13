import { Prisma, type PrismaClient } from "@prisma/client";
import { batchEligibility, MAX_REVIEW_BATCH, REVIEW_POLICY, requireTrustedSource, reviewSnapshot, reviewVersion } from "./review-policy";
import { reviewedClinicHosts } from "./source-trust";
import { config, DAY_MS } from "./config";

export class ReviewError extends Error {}
export type ReviewSelection = { id: string; version: string };
export const reviewInclude = { _count: { select: { fullReports: true, proposals: { where: { status: "pending" as const } } } } };

export function parseReviewSelection(values: FormDataEntryValue[]): ReviewSelection[] {
  if (!values.length || values.length > MAX_REVIEW_BATCH) throw new ReviewError(`Select between 1 and ${MAX_REVIEW_BATCH} listings.`);
  const selections = values.map((value) => {
    if (typeof value !== "string") throw new ReviewError("Invalid selection. Reload the queue.");
    const [id, version, extra] = value.split(":");
    if (!/^[a-z0-9_-]{1,128}$/i.test(id) || !/^[a-f0-9]{64}$/.test(version) || extra !== undefined) throw new ReviewError("Invalid selection. Reload the queue.");
    return { id, version };
  });
  if (new Set(selections.map((s) => s.id)).size !== selections.length) throw new ReviewError("A listing was selected twice. Reload the queue.");
  return selections;
}

/** All-or-nothing: changed versions or newly visible conflicts cancel the whole selection. */
export async function publishReviewBatch(db: PrismaClient, selection: ReviewSelection[]) {
  // Validate even internal callers; browser fields never determine eligibility or publication values.
  parseReviewSelection(selection.map((s) => `${s.id}:${s.version}`));
  try {
    return await db.$transaction(async (tx) => {
      const now = new Date();
      const listings = await tx.listing.findMany({ include: reviewInclude });
      const fsas = await tx.fsaCentroid.findMany({ select: { fsa: true } });
      const hosts = await reviewedClinicHosts(tx);
      const ctx = { listings, fsas: fsas.map((f) => f.fsa), hosts, now, requireTrustedSource: requireTrustedSource() };
      const items: Prisma.InputJsonObject[] = [];
      for (const selected of selection) {
        const listing = listings.find((l) => l.id === selected.id);
        if (!listing || reviewVersion(listing) !== selected.version) throw new ReviewError("A selected listing changed. Nothing was published. Reload and review the batch again.");
        const check = batchEligibility(listing, ctx);
        if (!check.eligible || !check.confirmed) throw new ReviewError(`${listing.clinic} needs individual review: ${check.reasons.join("; ")}. Nothing was published.`);
        // Match individual review: midnight UTC would display as the previous date in Toronto.
        const confirmed = new Date(Math.min(now.getTime(), check.confirmed.getTime() + 17 * 60 * 60 * 1000));
        const expiresAt = new Date(confirmed.getTime() + config.expiryDays * DAY_MS);
        const result = await tx.listing.updateMany({ where: { id: listing.id, status: "pending" }, data: { status: "live", lastConfirmedAt: confirmed, expiresAt } });
        if (result.count !== 1) throw new ReviewError("A selected listing is no longer pending. Nothing was published.");
        items.push({ listingId: listing.id, version: selected.version, before: reviewSnapshot(listing) as Prisma.InputJsonObject,
          after: { status: "live", lastConfirmedAt: confirmed.toISOString(), expiresAt: expiresAt.toISOString() } });
      }
      return tx.reviewDecision.create({ data: { mode: "batch", action: "publish", policy: REVIEW_POLICY,
        items: { listings: items, sourceHosts: hosts, requireTrustedSource: requireTrustedSource(), attestation: "Human authorized publication of the selected versions after reviewing the evidence." } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new ReviewError("The queue changed during approval. Nothing was published. Reload and review again.");
    throw error;
  }
}
