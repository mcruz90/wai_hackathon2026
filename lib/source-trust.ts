import type { PrismaClient } from "@prisma/client";
import { clinicSourceHosts } from "./review-policy";

/** Monitoring approval and permission to batch-publish are separate human decisions. */
export async function reviewedClinicHosts(db: Pick<PrismaClient, "discoverySource">): Promise<string[]> {
  const sources = await db.discoverySource.findMany({ where: { status: "active", kind: "clinic", trustedClinic: true, isSample: false }, select: { host: true }, distinct: ["host"] });
  return [...new Set([...clinicSourceHosts(), ...sources.map((s) => s.host)])].sort();
}
