import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { ruleDecision } from "../lib/agent/triage";
import { describeStep } from "../components/AgentTrace";

const page = (over: Partial<Parameters<typeof ruleDecision>[0]>) => ({ source_id: "s", url: "https://x.example/", host: "x.example", title: "", snippet: "", found_by: "search", social: false, is_sample: false, ...over });

test("triage rules: clear clinic and directory pages are watched; unclear pages go to a person; news and social posts are dismissed", () => {
  assert.equal(ruleDecision(page({ title: "Maple Family Health Team is accepting new patients" })).decision, "watch_clinic");
  assert.equal(ruleDecision(page({ title: "Clinique Rideau", snippet: "Nous acceptons de nouveaux patients" })).decision, "watch_clinic");
  assert.equal(ruleDecision(page({ title: "Find a family doctor in Peel: clinic directory" })).decision, "watch_directory");
  assert.equal(ruleDecision(page({ title: "Residents still waiting for a doctor", url: "https://www.cbc.ca/news/x" })).decision, "dismiss");
  assert.equal(ruleDecision(page({ title: "Maple Medical Clinic hours" })).decision, "watch_clinic", "a clinic page is watched even without new-patient words");
  assert.equal(ruleDecision(page({ title: "Something else" })).decision, "ask_human");
  assert.equal(ruleDecision(page({ title: "Careers", same_site_as_watched_clinic: true })).decision, "dismiss", "other pages of a watched clinic site are not watched twice");
  assert.equal(ruleDecision(page({ title: "Register as a new patient", same_site_as_watched_clinic: true })).decision, "watch_clinic");
  assert.equal(ruleDecision(page({ title: "We are accepting new patients!", social: true })).decision, "dismiss");
});

test("agent steps read as plain sentences", () => {
  const read = describeStep({ tool: "read_announcement", input: {}, result: { clinic: "Fernleaf", area: "Scarborough", fsa: "M1P", provider_type: "family_doctor", languages: [], date: null, accepting: "yes", confidence: { location: "high", provider_type: "high", languages: "low", date: "low" } } });
  assert.match(read, /Fernleaf · Scarborough M1P · family doctor · no languages stated · no date/);
  assert.match(read, /Less sure about: languages, date/);
  assert.equal(describeStep({ tool: "find_matching_listings", input: { clinic: "Fernleaf", phone: null }, result: { matches: [] } }), "Checked the directory for Fernleaf: no existing listing.");
  assert.match(describeStep({ tool: "sort_page", input: {}, result: {}, error: "boom" }), /failed \(boom\)/);
});

test("triage agent with PostgreSQL", { skip: !process.env.REVIEW_TEST_DATABASE_URL }, async (t) => {
  const { PrismaClient } = await import("@prisma/client");
  const { runTriageAgent } = await import("../lib/agent/triage");
  const schema = `triage_test_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.REVIEW_TEST_DATABASE_URL!);
  const root = new PrismaClient({ datasourceUrl: url.toString() }); url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const before = { provider: process.env.LLM_PROVIDER };
  process.env.LLM_PROVIDER = "mock";
  try {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    for (const folder of (await readdir("prisma/migrations")).filter((x) => /^\d/.test(x)).sort()) for (const sql of (await readFile(`prisma/migrations/${folder}/migration.sql`, "utf8")).split(";").map((x) => x.trim()).filter(Boolean)) await db.$executeRawUnsafe(sql);

    await t.test("sorts unsorted pages, never watches social posts, and leaves people's decisions alone", async () => {
      const mk = (u: string, title: string, extra = {}) => db.discoverySource.create({ data: { url: u, host: new URL(u).hostname, title, foundBy: "search", ...extra } });
      const clinic = await mk("https://maple.example/new-patients", "Maple Family Health Team accepting new patients");
      const social = await mk("https://www.facebook.com/maple/posts/1", "Accepting new patients!", { kind: "social" });
      const news = await mk("https://local-news.example/story", "Town news: doctor shortage continues");
      const decided = await mk("https://kept.example/", "Accepting new patients clinic", { status: "rejected", reviewedAt: new Date() });
      const r = await runTriageAgent({ db });
      assert.equal(r.pages, 3);
      const get = async (id: string) => db.discoverySource.findUniqueOrThrow({ where: { id } });
      assert.equal((await get(clinic.id)).status, "active");
      assert.equal((await get(clinic.id)).kind, "clinic");
      assert.equal((await get(social.id)).status, "rejected");
      assert.equal((await get(news.id)).status, "rejected");
      assert.equal((await get(news.id)).triageDecision, "dismiss");
      assert.equal((await get(decided.id)).triageDecision, null);
      assert.equal(await db.listing.count(), 0, "triage never creates listings");
      assert.ok((await db.discoverySearchState.findUnique({ where: { id: "ontario" } }))?.lastTriage);
      assert.equal((await runTriageAgent({ db })).pages, 0, "a second run has nothing new to sort");
    });

    await t.test("sorts more than one batch, in rounds of 10 with short page handles", async () => {
      for (let i = 0; i < 23; i++) await db.discoverySource.create({ data: { url: `https://batch${i}.example/new-patients`, host: `batch${i}.example`, title: `Batch ${i} Family Health Team accepting new patients`, foundBy: "search" } });
      const r = await runTriageAgent({ db });
      assert.equal(r.pages, 23);
      assert.equal(r.sorted.watch_clinic, 23);
      const lists = r.result.steps.filter((s) => s.tool === "list_new_pages").map((s) => (s.result as { pages: { page: string }[] }).pages.length);
      assert.deepEqual(lists, [10, 10, 3]);
      assert.equal((r.result.steps.find((s) => s.tool === "list_new_pages")!.result as { pages: { page: string }[] }).pages[0].page, "p1");
    });

    await t.test("the background loop sorts the whole queue, more than one run's cap, without clicks", async () => {
      const { sortQueueInBackground, unsortedCount, MAX_PAGES } = await import("../lib/agent/triage");
      for (let i = 0; i < MAX_PAGES + 15; i++) await db.discoverySource.create({ data: { url: `https://queue${i}.example/`, host: `queue${i}.example`, title: `Queue ${i} Medical Clinic`, foundBy: "search" } });
      const first = sortQueueInBackground({ db, pauseMs: 0 });
      assert.equal(sortQueueInBackground({ db, pauseMs: 0 }), first, "a second call joins the running loop");
      assert.equal(await first, MAX_PAGES + 15);
      assert.equal(await unsortedCount(db), 0);
    });

    await t.test("with Cohere, the model's decisions use page handles, and pages it skips go to a person", async () => {
      await db.discoverySource.create({ data: { url: "https://h1.example/", host: "h1.example", title: "Elm Clinic accepting new patients", foundBy: "search" } });
      await db.discoverySource.create({ data: { url: "https://h2.example/", host: "h2.example", title: "Something else", foundBy: "search" } });
      const env = { p: process.env.LLM_PROVIDER, k: process.env.LLM_API_KEY }, realFetch = globalThis.fetch;
      process.env.LLM_PROVIDER = "cohere"; process.env.LLM_API_KEY = "test-only";
      const replies = [
        { tool_plan: "List the pages.", tool_calls: [{ id: "a", type: "function", function: { name: "list_new_pages", arguments: "{}" } }] },
        { tool_plan: "Watch p1.", tool_calls: [{ id: "b", type: "function", function: { name: "sort_pages", arguments: JSON.stringify({ decisions: [{ page: "p1", decision: "watch_clinic", reason: "Clinic taking new patients." }] }) } }] },
        { tool_calls: [{ id: "c", type: "function", function: { name: "finish", arguments: JSON.stringify({ summary: "Watched one." }) } }] },
      ];
      let n = 0;
      globalThis.fetch = (async () => new Response(JSON.stringify({ message: replies[n++] }), { status: 200 })) as unknown as typeof fetch;
      try {
        const r = await runTriageAgent({ db });
        assert.equal(r.result.planner, "cohere");
        const h1 = await db.discoverySource.findUniqueOrThrow({ where: { url: "https://h1.example/" } });
        const h2 = await db.discoverySource.findUniqueOrThrow({ where: { url: "https://h2.example/" } });
        assert.equal(h1.triageDecision, "watch_clinic");
        assert.equal(h2.triageDecision, "ask_human");
      } finally {
        globalThis.fetch = realFetch;
        if (env.p === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = env.p;
        if (env.k === undefined) delete process.env.LLM_API_KEY; else process.env.LLM_API_KEY = env.k;
      }
    });
  } finally {
    if (before.provider === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = before.provider;
    await db.$disconnect();
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await root.$disconnect();
  }
});
