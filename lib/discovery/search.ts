import { EnvHttpProxyAgent, fetch as request } from "undici";
import { canonicalSourceUrl } from "./web";

export const ONTARIO_REGIONS = ["Ontario", "Ottawa Kingston Eastern Ontario", "Toronto GTA", "Hamilton Niagara", "Kitchener Waterloo Guelph", "London Windsor Southwestern Ontario", "Barrie Simcoe Muskoka", "Peterborough Kawartha", "Sudbury North Bay Northeastern Ontario", "Thunder Bay Northwestern Ontario", "Timmins Sault Ste. Marie Northern Ontario"];
export type SearchLead = { url: string; title: string; query: string; snippet?: string; isSample?: boolean };
export function queriesForDay(now: Date, limit = 3): string[] {
  const day = Math.floor(now.getTime()/864e5);
  return Array.from({ length: Math.min(Math.max(1,limit), ONTARIO_REGIONS.length) }, (_, i) => {
    const region = ONTARIO_REGIONS[(day*3+i)%ONTARIO_REGIONS.length];
    return (day+i)%3 === 0 ? `"nouveaux patients" ("médecin de famille" OR "infirmière praticienne") ${region} Ontario` : `"accepting new patients" ("family doctor" OR "nurse practitioner") ${region} Ontario`;
  });
}
export function sourceKind(url: string): string {
  const host = new URL(url).hostname.toLowerCase();
  return /(?:^|\.)(facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com|threads\.net|linkedin\.com|youtube\.com|reddit\.com|redd\.it|bsky\.app|weibo\.com|fb\.watch|m\.me|pinterest\.com)$/.test(host) ? "social" : "unknown";
}
/** Web search for new clinic notices. Tavily (free tier: 1,000 basic searches a month) is the only provider; anything else means off. */
/** The search provider in use: "tavily", "mock" (offline, no API calls) or "off". */
export function searchProvider(): "tavily" | "mock" | "off" {
  const p = process.env.DISCOVERY_SEARCH_PROVIDER;
  return p === "tavily" || p === "mock" ? p : "off";
}

/**
 * Offline stand-in for web search, for testing and demos without spending Tavily credits.
 * Runs the same daily queries and returns invented leads on reserved .example hosts, marked as samples:
 * they can be reviewed in the workspace like real leads, but are never fetched or monitored.
 */
export function mockSearch(now: Date, limit = 3): SearchLead[] {
  return queriesForDay(now, limit).flatMap((query) => {
    // Longest match first: every query also contains the word "Ontario".
    const region = [...ONTARIO_REGIONS].sort((x, y) => y.length - x.length).find((r) => query.includes(r)) ?? "Ontario";
    const slug = region.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const french = query.includes("nouveaux");
    return [
      { url: `https://${slug}-family-health.example/${french ? "nouveaux-patients" : "new-patients"}`, title: `Sample search result: ${region} family health team ${french ? "accepte de nouveaux patients" : "accepting new patients"}`, query, isSample: true,
        snippet: french ? "Notre équipe de santé familiale accepte de nouveaux patients. Inscription en ligne ou par téléphone." : "Our family health team is accepting new patients. Register online or by phone." },
      { url: `https://${slug}-np-clinic.example/accepting`, title: `Sample search result: ${region} nurse practitioner clinic`, query, isSample: true,
        snippet: "Nurse practitioner-led clinic. Hours, services and how to contact us." },
      { url: `https://${slug}-news.example/health/doctor-shortage`, title: `Sample search result: ${region} residents still waiting for a family doctor`, query, isSample: true,
        snippet: "A local news story about the family doctor shortage. Mentions one clinic that opened its list last month." },
    ];
  });
}

export async function searchOntario(now: Date, limit = 3): Promise<SearchLead[]> {
  if (searchProvider() === "mock") return mockSearch(now, limit);
  if (searchProvider() !== "tavily") return [];
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("Set TAVILY_API_KEY in server-side environment settings to enable web search.");
  const leads: SearchLead[] = [], dispatcher = new EnvHttpProxyAgent();
  try {
    for (const query of queriesForDay(now, limit)) {
      // One basic search costs one Tavily credit. No answer or page content is requested: only result links become source leads.
      const response = await request("https://api.tavily.com/search", {
        method: "POST", dispatcher, redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ query, search_depth: "basic", topic: "general", max_results: 10, include_answer: false, include_raw_content: false, include_images: false }),
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Web search returned HTTP ${response.status}.`); }
      const chunks: Uint8Array[] = []; let size = 0;
      if (response.body) for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > 1000000) throw new Error("Web search response is too large.");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { results?: { url?: string; title?: string; content?: string }[] };
      for (const result of body.results ?? []) try {
        const url = canonicalSourceUrl(result.url ?? "");
        if (!leads.some((l) => l.url === url)) leads.push({ url, title: (result.title ?? "").slice(0,300), query, snippet: (result.content ?? "").slice(0,500) });
      } catch { /* Invalid results are not sources. */ }
    }
  } finally { await dispatcher.close(); }
  return leads.slice(0,30);
}
