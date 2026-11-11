import "./env";
import { prisma } from "../lib/db";

/** Explicit sample fixtures for trying batch review locally; no LLM calls or real listings. */
async function main() {
  const centroid = await prisma.fsaCentroid.findUniqueOrThrow({ where: { fsa: "M1P" } });
  const date = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  for (const [suffix, clinic, phone, uncertain] of [
    ["fernleaf", "Fernleaf Family Practice", "416-555-0195", false],
    ["maplecrest", "Maplecrest Family Clinic", "416-555-0196", false],
    ["cedar", "Cedar Grove Medical", "416-555-0197", true],
  ] as const) {
    const id = `sample-review-${suffix}`;
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (existing && !existing.isSample) throw new Error(`Refusing to replace non-sample listing ${id}.`);
    const data = {
      clinic, area: "Scarborough", fsa: centroid.fsa, lat: centroid.lat, lng: centroid.lng,
      providerType: "family_doctor" as const, languages: ["English", "Tagalog"], phone,
      sourceType: "web", sourceUrl: `https://demo-clinic.example/${suffix}`, isSample: true,
      rawText: `Invented sample announcement. ${uncertain ? "" : date + ": "}${clinic} in Scarborough M1P is accepting new patients with a family doctor. Care in English and Tagalog. Call ${phone}.`,
      confidence: { location: "high", provider_type: "high", provider_type_read: "family_doctor", languages: "high", date: uncertain ? "low" : "high",
        date_read: uncertain ? null : date, accepting: "yes", notes: uncertain ? "No date in this sample announcement." : "" },
      status: "pending" as const, lastConfirmedAt: null, expiresAt: null, createdAt: new Date(),
    };
    await prisma.listing.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  const stale = await prisma.listing.findFirst({ where: { id: "sample-6", isSample: true } });
  if (stale) {
    const id = "sample-review-recheck";
    const previous = await prisma.agentProposal.findUnique({ where: { id }, include: { listing: true } });
    if (previous && !previous.listing?.isSample) throw new Error("Refusing to replace a non-sample proposal.");
    const data = { agent: "freshness", action: "recheck_listing", listingId: stale.id, priority: "high", status: "pending" as const, decidedAt: null,
      rationale: "Sample clinic is approaching expiry. A reviewer needs to confirm availability.",
      payload: { call_script: `Hello, I'm calling about our directory listing for ${stale.clinic}.\nAre you still taking new patients? Which languages can patients receive care in?` }, trace: [],
    };
    await prisma.agentProposal.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  console.log("Added/reset 3 invented sample review listings and a sample clinic check. Real listings were untouched.");
  console.log("For this local demo only, set CLINIC_SOURCE_HOSTS=demo-clinic.example and restart the app. The .example links are placeholders.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
