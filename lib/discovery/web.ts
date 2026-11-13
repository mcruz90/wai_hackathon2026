import { lookup } from "node:dns/promises";
import { isIP, BlockList } from "node:net";
import { createHash } from "node:crypto";
import { Agent, EnvHttpProxyAgent, fetch as request } from "undici";
import { load } from "cheerio";
import robotsParser from "robots-parser";

export const CRAWLER = "OntarioDoctorFinderBot";
const blocked = new BlockList();
for (const [address, prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",3]] as const) blocked.addSubnet(address, prefix, "ipv4");

export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) return !blocked.check(address, "ipv4");
  if (isIP(address) !== 6) return false;
  // Only ordinary global unicast; exclude mapped IPv4, tunnels, documentation, and local ranges.
  return /^[23][0-9a-f]{3}:/i.test(address) && !/^(2001:(?:0:|db8:)|2002:|3fff:)/i.test(address);
}
export function canonicalSourceUrl(value: string): string {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443") || isIP(u.hostname) ||
      !/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(u.hostname) || /(?:^|\.)(localhost|local|internal|invalid|test)$/i.test(u.hostname)) throw new Error("Use a public HTTPS page without credentials, IP addresses, or a custom port.");
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) u.searchParams.delete(key);
  if ([...u.searchParams.keys()].some((key) => /^(access_token|token|auth|authorization|password|passwd|api[_-]?key|secret|session|sessionid)$/i.test(key))) throw new Error("Credential-bearing query parameters are not source URLs.");
  u.searchParams.sort();
  return u.toString();
}
async function publicLookup(host: string) {
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address))) throw new Error("Source resolves to a non-public address.");
  return addresses;
}
const direct = new Agent({ connect: { lookup: (host, options, callback) => {
  publicLookup(host).then((addresses) => {
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  }).catch((error: Error) => callback(error, "", 4));
} } });
// Configured proxies enforce their own destination routing. Direct connections pin validated DNS answers.
const proxy = new EnvHttpProxyAgent();
const dispatcher = () => process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy ? proxy : direct;

async function smallGet(value: string, limit: number, signal: AbortSignal, allowed?: (url: string) => boolean): Promise<{ url: string; status: number; type: string; text: string }> {
  let url = canonicalSourceUrl(value);
  const origin = new URL(url).origin;
  for (let hop = 0; hop <= 3; hop++) {
    if (allowed && !allowed(url)) throw new Error("robots.txt disallows a redirect destination.");
    await publicLookup(new URL(url).hostname);
    const res = await request(url, { dispatcher: dispatcher(), redirect: "manual", signal,
      headers: { "user-agent": `${CRAWLER}/1.0 (+public clinic announcement monitoring)`, accept: "text/html,text/plain;q=0.9" } });
    if ([301,302,303,307,308].includes(res.status)) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new Error("Redirect has no destination.");
      const next = canonicalSourceUrl(new URL(location, url).toString());
      if (new URL(next).origin !== origin) throw new Error(`Source redirects to ${new URL(next).origin}; add and review the destination page first.`);
      url = next; continue;
    }
    const length = Number(res.headers.get("content-length"));
    if (length > limit) { await res.body?.cancel(); throw new Error("Source exceeds the page-size limit."); }
    const chunks: Uint8Array[] = []; let size = 0;
    if (res.body) for await (const chunk of res.body) {
      size += chunk.byteLength;
      if (size > limit) { await res.body.cancel().catch(() => {}); throw new Error("Source exceeds the page-size limit."); }
      chunks.push(chunk);
    }
    return { url, status: res.status, type: res.headers.get("content-type") ?? "", text: Buffer.concat(chunks).toString("utf8") };
  }
  throw new Error("Too many redirects.");
}
export type PageEvidence = { url: string; title: string; excerpt: string; publishedDate: string | null; contentHash: string; links: { url: string; title: string }[] };
export function parsePage(html: string, url: string): PageEvidence {
  const $ = load(html);
  const title = $("title").first().text().trim().slice(0, 300);
  const publication = $('meta[property="article:published_time"],meta[name="date"],meta[itemprop="datePublished"]').first().attr("content") ?? "";
  const publishedDate = /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(publication) ? publication.slice(0,10) : null;
  // Link text only: <noscript> fallbacks inside a link (common for lazy-loaded images) hold raw HTML as text.
  const linkText = (a: Parameters<typeof $>[0]) => {
    const el = $(a).clone();
    el.find("noscript,script,style,svg,img").remove();
    const text = el.text().replace(/<[^>]*>?/g, " ").replace(/\s+/g, " ").trim();
    return (text || $(a).attr("aria-label") || $(a).attr("title") || "").trim().slice(0,200);
  };
  const links = $("a[href]").toArray().map((a) => ({ href: $(a).attr("href")!, title: linkText(a) }))
    .filter((a) => /clinic|family|patients?|register|registration|accepting|médecin|inscription/i.test(a.title+" "+a.href))
    .flatMap((a) => { try { return [{ url: canonicalSourceUrl(new URL(a.href,url).toString()), title: a.title }]; } catch { return []; } })
    .filter((a, i, all) => a.url !== url && all.findIndex((b) => b.url === a.url) === i).slice(0,10);
  $("script,style,noscript,nav,form,svg,iframe,[hidden],[aria-hidden=true],[style*=\"display:none\"],[style*=\"display: none\"]").remove();
  $("p,div,section,article,h1,h2,h3,h4,li,br,footer,address").append("\n");
  const text = $("body").text().replace(/[\t\r ]+/g, " ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  const position = text.search(/accepting|new patients|taking patients|registration|nouveaux patients|inscription/i);
  const start = position > 1800 ? position-1800 : 0;
  const excerpt = text.slice(start,start+6000);
  const contentHash = createHash("sha256").update(JSON.stringify({ title, excerpt, publishedDate, links: links.map((link) => link.url).sort() })).digest("hex");
  return { url, title, excerpt, publishedDate, contentHash, links };
}
export async function fetchClinicPage(value: string, get = smallGet): Promise<PageEvidence> {
  const url = canonicalSourceUrl(value), signal = AbortSignal.timeout(15000);
  const robotsUrl = new URL("/robots.txt", url).toString();
  let allowed: ((target: string) => boolean) | undefined;
  const robots = await get(robotsUrl, 64000, signal);
  if (robots.status !== 404 && robots.status !== 410) {
    if (robots.status !== 200) throw new Error("robots.txt could not be checked. Collection deferred.");
    if (/text\/html/i.test(robots.type)) throw new Error("robots.txt returned HTML instead of crawl rules. Collection deferred.");
    const rules = robotsParser(robotsUrl, robots.text);
    allowed = (target) => rules.isAllowed(target, CRAWLER) !== false;
    if (rules.isAllowed(url, CRAWLER) === false) throw new Error("robots.txt disallows this page.");
    const delay = rules.getCrawlDelay(CRAWLER) ?? 1;
    if (delay > 10) throw new Error("Source requests a crawl delay above this collector's limit. Check manually.");
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, delay)*1000));
  }
  const page = await get(url, 512000, signal, allowed);
  if (page.status !== 200) throw new Error(`Source returned HTTP ${page.status}.`);
  if (!/text\/html|application\/xhtml\+xml/i.test(page.type)) throw new Error("Only public HTML pages are supported.");
  return parsePage(page.text, page.url);
}
