import type { PrismaClient, DiscoverySource } from "@prisma/client";
import { runIntakeAgent } from "../agent/intake";
import { DAY_MS } from "../config";
import { canonicalSourceUrl, fetchClinicPage, type PageEvidence } from "./web";
import { searchOntario, searchProvider, sourceKind, type SearchLead } from "./search";

export async function addDiscoverySource(db: PrismaClient, input: { url: string; title?: string; foundBy?: string; query?: string; snippet?: string; isSample?: boolean }) {
  const url = canonicalSourceUrl(input.url);
  return db.discoverySource.upsert({ where: { url }, update: {}, create: { url, host: new URL(url).hostname,
    title: (input.title ?? "").slice(0,300), kind: sourceKind(url), foundBy: input.foundBy ?? "manual", query: input.query?.slice(0,500), snippet: (input.snippet ?? "").slice(0,500), isSample: input.isSample ?? false } });
}
export type DiscoveryDependencies = {
  fetchPage?: (url: string) => Promise<PageEvidence>;
  search?: (now: Date, limit: number) => Promise<SearchLead[]>;
  intake?: typeof runIntakeAgent;
};
export async function collectSource(db: PrismaClient, source: DiscoverySource, deps: DiscoveryDependencies = {}, now = new Date()): Promise<string> {
  const leaseUntil = new Date(now.getTime()+10*60000);
  const claimed = await db.discoverySource.updateMany({ where: { id: source.id, status: "active", nextCheckAt: { lte: now },
    OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil } });
  if (!claimed.count) return "busy_or_not_due";
  let checkId: string | null = null;
  try {
    if (!["clinic","directory"].includes(source.kind)) throw new Error("Social and unknown sources are leads only. Approve a public clinic or directory page first.");
    if (source.isSample && !deps.fetchPage) throw new Error("Sample sources require the offline demo collector.");
    const page = await (deps.fetchPage ?? fetchClinicPage)(source.url);
    if (new URL(canonicalSourceUrl(page.url)).hostname !== source.host) throw new Error("Collected page belongs to a different host.");
    const current = await db.discoverySource.findUniqueOrThrow({ where: { id: source.id } });
    if (current.status !== "active" || current.leaseUntil?.getTime() !== leaseUntil.getTime()) return "paused";
    const seen = await db.discoveryCheck.findUnique({ where: { sourceId_contentHash: { sourceId: source.id, contentHash: page.contentHash } } });
    if (seen) {
      await db.discoverySource.update({ where: { id: source.id }, data: { lastHash: page.contentHash, lastCheckedAt: now, nextCheckAt: new Date(now.getTime()+DAY_MS) } });
      return "unchanged";
    }
    const check = await db.discoveryCheck.create({ data: { sourceId: source.id, sourceUrl: page.url, title: page.title,
      excerpt: page.excerpt, contentHash: page.contentHash, publishedDate: page.publishedDate, retrievedAt: now } });
    checkId = check.id;
    for (const link of page.links) await addDiscoverySource(db, { ...link, foundBy: `link:${source.id}`, isSample: source.isSample });
    let status = "skipped";
    if (source.kind === "clinic" && /new patients|taking patients|registration|nouveaux patients|inscription/i.test(page.excerpt)) {
      const outcome = await (deps.intake ?? runIntakeAgent)({ db, text: page.excerpt, sourceUrl: page.url, sourceType: "web", isSample: source.isSample, offline: source.isSample,
        today: now.toISOString().slice(0,10), discovery: { source_id: source.id, check_id: check.id, retrieved_at: now.toISOString(), content_hash: page.contentHash } });
      status = "proposed";
      await db.discoveryCheck.update({ where: { id: check.id }, data: { status, outcomeKind: outcome.kind, outcomeId: outcome.id } });
    } else await db.discoveryCheck.update({ where: { id: check.id }, data: { status: source.kind === "directory" ? "links_only" : "skipped" } });
    await db.discoverySource.update({ where: { id: source.id }, data: { lastHash: page.contentHash, lastCheckedAt: now, nextCheckAt: new Date(now.getTime()+DAY_MS), lastError: null } });
    return status;
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Collection failed.").slice(0,400);
    if (checkId) await db.discoveryCheck.update({ where: { id: checkId }, data: { status: "error", error: message } });
    await db.discoverySource.update({ where: { id: source.id }, data: { lastCheckedAt: now, nextCheckAt: new Date(now.getTime()+3600000), lastError: message } });
    return "error";
  } finally {
    await db.discoverySource.updateMany({ where: { id: source.id, leaseUntil }, data: { leaseUntil: null } });
  }
}

/** One discovery run: web search for new pages, then checks of approved pages. `search: false` or `monitor: false` runs only the other half. */
export async function runDiscoveryJob(db: PrismaClient, options: { manual?: boolean; maxSources?: number; maxQueries?: number; now?: Date; deps?: DiscoveryDependencies; search?: boolean; monitor?: boolean } = {}) {
  if (!options.manual && process.env.DISCOVERY_ENABLED !== "true") return { enabled: false, found: 0, checked: 0, proposed: 0, unchanged: 0, errors: 0, searchError: null as string | null };
  const now = options.now ?? new Date(), deps = options.deps ?? {};
  const result = { enabled: true, found: 0, checked: 0, proposed: 0, unchanged: 0, errors: 0, searchError: null as string | null };
  const provider = searchProvider();
  if (options.search !== false && (deps.search || provider !== "off")) {
    await db.discoverySearchState.upsert({ where: { id: "ontario" }, update: {}, create: { id: "ontario", nextSearchAt: now } });
    const searchLease = new Date(now.getTime()+10*60000);
    const claim = await db.discoverySearchState.updateMany({ where: { id: "ontario", nextSearchAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil: searchLease } });
    if (claim.count) {
      try {
        for (const lead of await (deps.search ?? searchOntario)(now, Math.min(options.maxQueries ?? 3,3))) {
          const before = await db.discoverySource.findUnique({ where: { url: canonicalSourceUrl(lead.url) } });
          await addDiscoverySource(db, { ...lead, foundBy: "search" });
          if (!before) result.found++;
        }
        await db.discoverySearchState.updateMany({ where: { id: "ontario", leaseUntil: searchLease }, data: { lastSearchedAt: now, nextSearchAt: new Date(now.getTime()+(provider === "mock" && !deps.search ? 0 : DAY_MS)), lastError: null } });
      } catch (error) {
        result.searchError = (error instanceof Error ? error.message : "Search failed.").slice(0,400);
        await db.discoverySearchState.updateMany({ where: { id: "ontario", leaseUntil: searchLease }, data: { nextSearchAt: new Date(now.getTime()+3600000), lastError: result.searchError } });
      } finally { await db.discoverySearchState.updateMany({ where: { id: "ontario", leaseUntil: searchLease }, data: { leaseUntil: null } }); }
    }
  }
  if (options.monitor === false) return result;
  const sources = await db.discoverySource.findMany({ where: { status: "active", isSample: false, nextCheckAt: { lte: now } },
    orderBy: { nextCheckAt: "asc" }, take: Math.min(options.maxSources ?? 20,20) });
  // Sequential monitoring bounds load; each page also observes robots.txt and its crawl delay.
  for (const source of sources) {
    const outcome = await collectSource(db, source, deps, now);
    if (outcome === "busy_or_not_due") continue;
    result.checked++;
    if (outcome === "proposed") result.proposed++;
    if (outcome === "unchanged") result.unchanged++;
    if (outcome === "error") result.errors++;
  }
  return result;
}
