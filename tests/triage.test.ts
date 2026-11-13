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
  assert.equal(ruleDecision(page({ title: "Maple Medical Clinic hours" })).decision, "ask_human");
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
  } finally {
    if (before.provider === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = before.provider;
    await db.$disconnect();
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await root.$disconnect();
  }
});
