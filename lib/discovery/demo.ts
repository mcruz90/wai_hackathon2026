import type { PrismaClient } from "@prisma/client";
import { addDiscoverySource, collectSource } from "./service";
import { parsePage } from "./web";

export async function runDiscoveryDemo(db: PrismaClient) {
  const url = "https://demo-clinic.example/ottawa-announcement";
  const source = await addDiscoverySource(db, { url, title: "Invented Ottawa clinic announcement", foundBy: "offline_demo", isSample: true });
  if (!source.isSample) throw new Error("The demo URL is attached to a non-sample source. Nothing changed.");
  if (source.status !== "active") return "The sample Ottawa source is ready for review. Classify it as a clinic and authorize monitoring, then run the offline demo again.";
  const date = new Date(Date.now()-864e5).toISOString().slice(0,10);
  const html = `<html><head><title>Rideau Sample Family Clinic</title><meta property="article:published_time" content="${date}"></head><body><h1>Invented sample announcement</h1><p>${date}: Registration at Rideau Sample Family Clinic in Ottawa K1S 1A1 is open. Our family doctor is accepting new patients. Care is offered in English and French. Call 613-555-0148.</p></body></html>`;
  await db.discoverySource.update({ where: { id: source.id }, data: { nextCheckAt: new Date() } });
  const result = await collectSource(db, source, { fetchPage: async () => parsePage(html,url) });
  return result === "proposed" ? "Collected the invented Ottawa announcement and prepared a sample review candidate. No network or LLM calls were made." : `Offline demo: ${result}. Unchanged source evidence does not create another proposal or refresh availability.`;
}
