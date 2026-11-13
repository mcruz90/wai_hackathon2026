import test from "node:test";
import assert from "node:assert/strict";
import { canonicalSourceUrl, fetchClinicPage, parsePage, publicAddress } from "../lib/discovery/web";
import { ONTARIO_REGIONS, queriesForDay, sourceKind } from "../lib/discovery/search";
import { FSA_CODES, FSA_TABLE, isOntarioFsa } from "../lib/fsa";
import { normalize } from "../lib/extract";
import { score } from "../lib/ranking";

test("Ontario coverage includes eastern, central, southwestern and northern postal areas", () => {
  assert.equal(FSA_CODES.length,527);
  for (const fsa of ["K1S","K7L","L8P","M1P","N2L","N6A","P3E","P7B"]) assert.ok(FSA_TABLE[fsa],fsa);
  for (const [fsa,[lat,lng]] of Object.entries(FSA_TABLE)) {
    assert.equal(isOntarioFsa(fsa),true); assert.ok(lat>=41.5 && lat<=57); assert.ok(lng>=-95.2 && lng<=-74);
  }
  assert.equal(isOntarioFsa("H2X"),false);
  assert.equal(normalize({fsa:"K1S",confidence:{location:"high"}}).fsa,"K1S");
  const outside = normalize({fsa:"H2X",confidence:{location:"high"},date:"2026-02-30"});
  assert.equal(outside.fsa,null);assert.equal(outside.confidence.location,"low");assert.equal(outside.date,null);
  const unknown = score({lat:45.4,lng:-75.7,languages:["English"],lastConfirmedAt:new Date()},null,["English"],30);
  assert.equal(unknown.d,null);assert.ok(unknown.score<=0.75);
});

test("source normalization removes tracking but rejects private URLs and credential-bearing targets", () => {
  assert.equal(canonicalSourceUrl("https://Clinic.Example/news?utm_source=social&b=2&a=1#top"),"https://clinic.example/news?a=1&b=2");
  for (const url of ["http://clinic.example", "https://user:pass@clinic.example", "https://clinic.example:8443", "https://127.0.0.1", "https://2130706433", "https://[::1]", "https://localhost", "https://foo.localhost", "https://metadata.internal", "file:///etc/passwd", "https://clinic.example/news?access_token=private"]) assert.throws(()=>canonicalSourceUrl(url),url);
  for (const address of ["127.0.0.1","10.0.0.1","169.254.169.254","100.64.0.1","192.168.1.1","172.16.0.1","0.0.0.0","224.0.0.1","::1","::ffff:127.0.0.1","fe80::1","fc00::1","2001:db8::1"]) assert.equal(publicAddress(address),false,address);
  assert.equal(publicAddress("8.8.8.8"),true);assert.equal(publicAddress("2606:4700:4700::1111"),true);
});

test("HTML evidence excludes scripts and navigation, preserves source dates, and hashes substantive changes", () => {
  const html='<html><head><title>Clinic</title><meta property="article:published_time" content="2026-11-01T10:00:00Z"></head><body><nav>Account</nav><script>steal()</script><h1>Accepting new patients</h1><p>Ottawa K1S</p><a href="/register?utm_source=x">Registration</a><a href="javascript:alert(1)">Clinic</a></body></html>';
  const a=parsePage(html,"https://clinic.example/news");
  assert.equal(a.publishedDate,"2026-11-01");assert.ok(!a.excerpt.includes("steal"));assert.ok(!a.excerpt.includes("Account"));assert.ok(a.excerpt.includes("Ottawa K1S"));
  assert.deepEqual(a.links,[{url:"https://clinic.example/register",title:"Registration"}]);
  assert.equal(a.contentHash,parsePage(html.replace("Account","Other navigation"),a.url).contentHash);
  assert.notEqual(a.contentHash,parsePage(html.replace("/register?","/new-register?"),a.url).contentHash);
  assert.notEqual(a.contentHash,parsePage(html.replace("Accepting new patients","No longer accepting new patients"),a.url).contentHash);
  assert.equal(parsePage('<body>Accepting new patients</body>',a.url).publishedDate,null);
});

test("robots restrictions prevent collection and apply to redirected destinations", async () => {
  let calls=0;
  await assert.rejects(fetchClinicPage("https://clinic.example/news",async (url)=>{
    calls++;return {url,status:200,type:"text/plain",text:"User-agent: *\nDisallow: /news"};
  }),/disallows/);
  assert.equal(calls,1);
  await assert.rejects(fetchClinicPage("https://clinic.example/news",async (url)=>({url,status:503,type:"text/plain",text:"Unavailable"})),/could not be checked/);
  let redirectBlocked=false;
  await fetchClinicPage("https://clinic.example/news",async (url,_limit,_signal,allowed)=>{
    if (url.endsWith("robots.txt")) return {url,status:200,type:"text/plain",text:"User-agent: *\nDisallow: /private"};
    redirectBlocked=allowed?.("https://clinic.example/private")===false;
    return {url,status:200,type:"text/html",text:"<body>Accepting new patients in Ottawa K1S</body>"};
  });
  assert.equal(redirectBlocked,true);
});

test("search rotates across Ontario regions and treats social posts as untrusted leads", () => {
  const all=Array.from({length:11},(_,i)=>queriesForDay(new Date(Date.UTC(2026,10,i+1)))).flat();
  for (const region of ONTARIO_REGIONS) assert.ok(all.some((q)=>q.includes(region)),region);
  assert.ok(all.some((q)=>q.includes("nouveaux patients")));assert.ok(all.some((q)=>q.includes("accepting new patients")));
  assert.equal(queriesForDay(new Date()).length,3);
  assert.equal(sourceKind("https://www.instagram.com/clinic/p/123"),"social");
  assert.equal(sourceKind("https://www.reddit.com/r/ontario/"),"social");
  assert.equal(sourceKind("https://clinic.example/new-patients"),"unknown");
});

test("mock search returns sample leads on .example hosts without calling Tavily", async () => {
  const { mockSearch, searchOntario, queriesForDay } = await import("../lib/discovery/search");
  const before = { p: process.env.DISCOVERY_SEARCH_PROVIDER, k: process.env.TAVILY_API_KEY };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error("mock search must not call the network"); }) as unknown as typeof fetch;
  process.env.DISCOVERY_SEARCH_PROVIDER = "mock"; delete process.env.TAVILY_API_KEY;
  try {
    const now = new Date("2026-11-13T12:00:00Z");
    const leads = await searchOntario(now, 3);
    assert.deepEqual(leads, mockSearch(now, 3));
    assert.equal(leads.length, queriesForDay(now, 3).length * 2);
    assert.equal(new Set(leads.map((l) => l.url)).size, leads.length, "each query gets its own sample links");
    for (const l of leads) {
      assert.equal(l.isSample, true);
      assert.match(new URL(l.url).hostname, /\.example$/);
      assert.match(l.title, /^Sample search result/);
    }
  } finally {
    globalThis.fetch = realFetch;
    if (before.p === undefined) delete process.env.DISCOVERY_SEARCH_PROVIDER; else process.env.DISCOVERY_SEARCH_PROVIDER = before.p;
    if (before.k !== undefined) process.env.TAVILY_API_KEY = before.k;
  }
});
