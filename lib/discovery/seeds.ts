import type { PrismaClient } from "@prisma/client";
import sources from "../../data/discovery-seeds.json";
import { addDiscoverySource } from "./service";
/** Starting URLs, not claims of availability. Existing review decisions are never overwritten. */
export async function seedDiscoverySources(db: PrismaClient): Promise<number> {
  let added = 0;
  for (const source of sources) {
    const before = await db.discoverySource.findUnique({ where: { url: source.url } });
    await addDiscoverySource(db, { ...source, foundBy: "starter_catalog" });
    if (!before) added++;
  }
  return added;
}
