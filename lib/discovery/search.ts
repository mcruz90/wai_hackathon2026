import { EnvHttpProxyAgent, fetch as request } from "undici";
import { canonicalSourceUrl } from "./web";

export const ONTARIO_REGIONS = ["Ontario", "Ottawa Kingston Eastern Ontario", "Toronto GTA", "Hamilton Niagara", "Kitchener Waterloo Guelph", "London Windsor Southwestern Ontario", "Barrie Simcoe Muskoka", "Peterborough Kawartha", "Sudbury North Bay Northeastern Ontario", "Thunder Bay Northwestern Ontario", "Timmins Sault Ste. Marie Northern Ontario"];
export type SearchLead = { url: string; title: string; query: string };
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
export async function searchOntario(now: Date, limit = 3): Promise<SearchLead[]> {
  if (process.env.DISCOVERY_SEARCH_PROVIDER !== "brave") return [];
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new Error("Set BRAVE_SEARCH_API_KEY in server-side environment settings to enable web search.");
  const leads: SearchLead[] = [], dispatcher = new EnvHttpProxyAgent();
  try {
    for (const query of queriesForDay(now, limit)) {
      const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
      endpoint.search = new URLSearchParams({ q: query, country: "CA", search_lang: query.includes("nouveaux") ? "fr" : "en", count: "10", safesearch: "moderate" }).toString();
      const response = await request(endpoint, { dispatcher, redirect: "error", signal: AbortSignal.timeout(10000), headers: { accept: "application/json", "x-subscription-token": key } });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Web search returned HTTP ${response.status}.`); }
      const chunks: Uint8Array[] = []; let size = 0;
      if (response.body) for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > 1000000) throw new Error("Web search response is too large.");
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString("utf8");
      const body = JSON.parse(text) as { web?: { results?: { url?: string; title?: string }[] } };
      for (const result of body.web?.results ?? []) try {
        const url = canonicalSourceUrl(result.url ?? "");
        if (!leads.some((l) => l.url === url)) leads.push({ url, title: (result.title ?? "").slice(0,300), query });
      } catch { /* Invalid results are not sources. */ }
    }
  } finally { await dispatcher.close(); }
  return leads.slice(0,30);
}
