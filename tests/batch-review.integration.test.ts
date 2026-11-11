import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

// Explicit opt-in. A fresh schema is created and dropped; existing schemas are never cleared.
test("batch publishing with PostgreSQL", { skip: !process.env.REVIEW_TEST_DATABASE_URL }, async (t) => {
  const { PrismaClient } = await import("@prisma/client");
  const { publishReviewBatch, reviewInclude, parseReviewSelection } = await import("../lib/batch-review");
  const { reviewVersion } = await import("../lib/review-policy");
  const { shortDate } = await import("../lib/i18n");
  const schema = `review_test_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.REVIEW_TEST_DATABASE_URL!);
  const root = new PrismaClient({ datasourceUrl: url.toString() });
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const previousHosts = process.env.CLINIC_SOURCE_HOSTS;
  process.env.CLINIC_SOURCE_HOSTS = "clinic.example";
  try {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    for (const folder of (await readdir("prisma/migrations")).filter((s) => /^\d/.test(s)).sort()) {
      const sql = await readFile(`prisma/migrations/${folder}/migration.sql`, "utf8");
      for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
    }
    await db.fsaCentroid.create({ data: { fsa: "M1P", lat: 43.7, lng: -79.2 } });
    const date = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    let counter = 0;
    async function listing(name: string) {
      const phone = `416555${String(++counter).padStart(4, "0")}`;
      return db.listing.create({ data: { clinic: name, area: "Scarborough", fsa: "M1P", lat: 43.7, lng: -79.2,
        providerType: "family_doctor", languages: ["English"], phone, sourceType: "web", sourceUrl: "https://clinic.example/news",
        rawText: `${date}: ${name} in Scarborough M1P is accepting new patients with a family doctor. Care in English. Call ${phone}.`,
        confidence: { location: "high", provider_type: "high", provider_type_read: "family_doctor", languages: "high", date: "high", date_read: date, accepting: "yes", notes: "" },
      }, include: reviewInclude });
    }
    const selection = (l: Awaited<ReturnType<typeof listing>>) => ({ id: l.id, version: reviewVersion(l) });

    await t.test("invalid, duplicate, empty, and oversized selections are rejected", () => {
      for (const values of [[], ["bad"], ["a:" + "a".repeat(64), "a:" + "a".repeat(64)], Array(101).fill("a:" + "a".repeat(64))]) assert.throws(() => parseReviewSelection(values));
    });

    await t.test("publishes only selected rows, preserves dates, and records snapshots atomically", async () => {
      const a = await listing("Fernleaf"), b = await listing("Maplecrest"), excluded = await listing("Birchwood");
      const decision = await publishReviewBatch(db, [selection(a), selection(b)]);
      for (const l of [a, b]) {
        const saved = await db.listing.findUniqueOrThrow({ where: { id: l.id } });
        assert.equal(saved.status, "live");
        assert.equal(saved.lastConfirmedAt!.toISOString().slice(0, 10), date);
        assert.equal(shortDate("en", saved.lastConfirmedAt!), shortDate("en", `${date}T17:00:00Z`));
      }
      assert.equal((await db.listing.findUniqueOrThrow({ where: { id: excluded.id } })).status, "pending");
      const items = decision.items as { listings: { listingId: string; version: string; before: { rawText: string } }[] };
      assert.equal(items.listings.length, 2);
      assert.equal(items.listings[0].version, reviewVersion(a));
      assert.equal(items.listings[0].before.rawText, a.rawText);
      assert.equal(decision.actor, "shared_admin");
      await assert.rejects(publishReviewBatch(db, [selection(a)]), /changed/);
    });

    await t.test("changed evidence rolls back earlier rows and leaves no audit record", async () => {
      const a = await listing("Juniper"), b = await listing("Willowbank");
      const count = await db.reviewDecision.count();
      await db.listing.update({ where: { id: b.id }, data: { rawText: "changed after page load" } });
      await assert.rejects(publishReviewBatch(db, [selection(a), selection(b)]), /changed/);
      assert.equal((await db.listing.findUniqueOrThrow({ where: { id: a.id } })).status, "pending");
      assert.equal(await db.reviewDecision.count(), count);
    });

    await t.test("a new patient report invalidates a previously eligible version", async () => {
      const a = await listing("Cedarbrook");
      await db.fullReport.create({ data: { listingId: a.id, tokenHash: "test-only" } });
      await assert.rejects(publishReviewBatch(db, [selection(a)]), /changed/);
    });

    await t.test("a new duplicate is caught even if the selected row itself did not change", async () => {
      const a = await listing("Oakridge");
      await db.listing.create({ data: { clinic: a.clinic, area: a.area, lat: a.lat, lng: a.lng, providerType: a.providerType, languages: a.languages, sourceType: "post" } });
      await assert.rejects(publishReviewBatch(db, [selection(a)]), /duplicate/);
    });

    await t.test("source trust is rechecked at publication time", async () => {
      const a = await listing("Pinehaven");
      process.env.CLINIC_SOURCE_HOSTS = "";
      await assert.rejects(publishReviewBatch(db, [selection(a)]), /configured clinic/);
      process.env.CLINIC_SOURCE_HOSTS = "clinic.example";
    });

    await t.test("concurrent approval publishes once and produces one decision", async () => {
      const a = await listing("Ashgrove"), before = await db.reviewDecision.count();
      const results = await Promise.allSettled([publishReviewBatch(db, [selection(a)]), publishReviewBatch(db, [selection(a)])]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(await db.reviewDecision.count(), before + 1);
    });
  } finally {
    if (previousHosts === undefined) delete process.env.CLINIC_SOURCE_HOSTS; else process.env.CLINIC_SOURCE_HOSTS = previousHosts;
    await db.$disconnect();
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await root.$disconnect();
  }
});
