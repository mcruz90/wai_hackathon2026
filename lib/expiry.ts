import { prisma } from "./db";

/** Marks live listings past their expiry date as expired. Returns the clinics it expired. */
export async function expireListings(now = new Date()): Promise<string[]> {
  const due = await prisma.listing.findMany({ where: { status: "live", expiresAt: { lte: now } }, select: { id: true, clinic: true } });
  if (due.length) await prisma.listing.updateMany({ where: { id: { in: due.map((d) => d.id) } }, data: { status: "expired" } });
  return due.map((d) => d.clinic);
}
