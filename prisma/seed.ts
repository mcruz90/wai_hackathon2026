/**
 * npm run db:seed            adds sample data where there is none (safe to run on every deploy)
 * npm run db:seed -- --refresh   deletes sample rows and re-creates them with fresh dates
 *
 * Everything created here is invented and flagged is_sample. No real clinic or person appears.
 */
import "../scripts/env";
import { prisma } from "../lib/db";
import { config, DAY_MS, NEARBY_KM } from "../lib/config";
import { FSA_TABLE, km } from "../lib/fsa";
import { EN_NAME, LANGS } from "../lib/i18n";
import { offerBody } from "../lib/waitlist";

const refresh = process.argv.includes("--refresh");
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type S = { id: number; name: string; area: string; fsa: string; at: [number, number]; type: "fd" | "np"; langs: string[]; src: string; age: number; phone: string };
const SAMPLE: S[] = [
  { id: 1, name: "Wren Street Family Practice", area: "Golden Mile, Scarborough", fsa: "M1L", at: [43.727, -79.288], type: "fd", langs: ["English", "Tagalog", "Tamil"], src: "web", age: 2, phone: "416-555-0112" },
  { id: 2, name: "Heron Road Nurse Practitioner Clinic", area: "Lawrence East, Scarborough", fsa: "M1P", at: [43.75, -79.27], type: "np", langs: ["English", "Mandarin", "Cantonese"], src: "post", age: 6, phone: "416-555-0127" },
  { id: 3, name: "Tamarack Court Health", area: "Thorncliffe Park", fsa: "M4H", at: [43.705, -79.349], type: "fd", langs: ["English", "Urdu", "Arabic", "Farsi"], src: "list", age: 11, phone: "416-555-0134" },
  { id: 4, name: "Juniper Lane Family Doctors", area: "Agincourt", fsa: "M1T", at: [43.788, -79.28], type: "fd", langs: ["English", "Mandarin", "Cantonese"], src: "web", age: 19, phone: "416-555-0141" },
  { id: 5, name: "Sumac Avenue Community Care", area: "Jane and Finch", fsa: "M3N", at: [43.758, -79.518], type: "np", langs: ["English", "Spanish", "Vietnamese"], src: "post", age: 4, phone: "416-555-0158" },
  { id: 6, name: "Larch Street Family Medicine", area: "Parkdale", fsa: "M6K", at: [43.64, -79.436], type: "fd", langs: ["English", "Tagalog", "Polish"], src: "news", age: 26, phone: "416-555-0163" },
  { id: 7, name: "Kestrel Avenue Clinic", area: "St. Clair West", fsa: "M6H", at: [43.679, -79.44], type: "fd", langs: ["English", "Spanish", "Portuguese", "Italian"], src: "web", age: 8, phone: "416-555-0170" },
  { id: 8, name: "Alder Centre Medical", area: "North York Centre", fsa: "M2N", at: [43.768, -79.413], type: "fd", langs: ["English", "Farsi", "Korean", "Mandarin"], src: "list", age: 14, phone: "416-555-0186" },
  { id: 9, name: "Bittern Road Family Health", area: "Rexdale", fsa: "M9V", at: [43.722, -79.572], type: "np", langs: ["English", "Punjabi", "Hindi", "Somali"], src: "post", age: 34, phone: "416-555-0191" },
  { id: 10, name: "Sorrel Street Doctors", area: "East Danforth", fsa: "M4C", at: [43.686, -79.305], type: "fd", langs: ["English", "French", "Bengali"], src: "web", age: 1, phone: "416-555-0104" },
  { id: 11, name: "Plover Lane Nurse Practitioner Clinic", area: "Downtown East", fsa: "M5A", at: [43.657, -79.365], type: "np", langs: ["English", "French", "Spanish", "Amharic"], src: "list", age: 9, phone: "416-555-0119" },
];

async function seedCentroids() {
  for (const [fsa, [lat, lng]] of Object.entries(FSA_TABLE))
    await prisma.fsaCentroid.upsert({ where: { fsa }, create: { fsa, lat, lng }, update: { lat, lng } });
}

async function seedListings() {
  if (refresh) await prisma.listing.deleteMany({ where: { isSample: true } });
  if (await prisma.listing.count({ where: { isSample: true } })) return console.log("Sample listings already present.");
  for (const s of SAMPLE) {
    const confirmed = daysAgo(s.age + 0.2);
    await prisma.listing.create({
      data: {
        id: `sample-${s.id}`, clinic: s.name, area: s.area, fsa: s.fsa, lat: s.at[0], lng: s.at[1],
        providerType: s.type === "np" ? "nurse_practitioner" : "family_doctor", languages: s.langs, phone: s.phone,
        sourceType: s.src, sourceUrl: null, rawText: null, status: "live", isSample: true,
        confidence: { location: "high", provider_type: "high", languages: "high", date: "high" },
        // One sample (34 days old with the default 30) is left live but past its date so the expiry job has something to do.
        lastConfirmedAt: confirmed, expiresAt: new Date(confirmed.getTime() + config.expiryDays * DAY_MS),
      },
    });
  }
  console.log(`Seeded ${SAMPLE.length} sample listings.`);
}

async function seedCounts() {
  if (refresh) await prisma.dailyCount.deleteMany({ where: { isSample: true } });
  if (await prisma.dailyCount.count({ where: { isSample: true } })) return console.log("Sample counts already present.");
  const rand = rng(20261111);
  // Daily search volume by area and language. Small numbers on purpose in a few cells to show suppression.
  const demand: [string, Partial<Record<(typeof LANGS)[number], number>>][] = [
    ["M1P", { en: 6, zh: 5, tl: 3 }], ["M1T", { zh: 7, en: 3 }], ["M1L", { tl: 4, en: 4, es: 0.1 }], ["M1B", { tl: 3, en: 2, zh: 2 }],
    ["M3N", { es: 5, en: 4, tl: 2 }], ["M9V", { en: 5, es: 3, fr: 2, tl: 1.5 }], ["M9W", { en: 3, zh: 1.5 }],
    ["M4H", { en: 5, fr: 0.1 }], ["M6K", { tl: 3, en: 4, es: 2 }], ["M5A", { fr: 3, en: 5, es: 2 }],
    ["M2N", { zh: 5, en: 3 }], ["M8V", { en: 2, es: 2, zh: 0.12 }], ["M4C", { fr: 2, en: 3 }],
  ];
  const rows = [];
  for (let day = 0; day < 30; day++) {
    const date = new Date(daysAgo(day).toISOString().slice(0, 10));
    for (const [fsa, langs] of demand) {
      for (const [language, base] of Object.entries(langs)) {
        const near = SAMPLE.filter((s) => s.age < 30 && s.langs.includes(EN_NAME[language as keyof typeof EN_NAME]) && km(FSA_TABLE[fsa], s.at) <= NEARBY_KM).length;
        const searches = Math.max(0, Math.round(base! * (0.5 + rand())));
        if (!searches) continue;
        const noMatch = near === 0 ? searches : Math.round(searches * (near === 1 ? 0.15 : 0.03) * rand() * 2);
        rows.push({
          date, fsa, language, isSample: true, searches, searchesNoLangMatch: Math.min(searches, noMatch),
          listingOpens: Math.round(searches * (near ? 0.5 + rand() * 0.4 : 0.15 * rand())), fullReports: rand() < 0.12 ? 1 : 0,
        });
      }
    }
  }
  await prisma.dailyCount.createMany({ data: rows });
  console.log(`Seeded ${rows.length} sample daily count rows over 30 days.`);
}

async function seedWaitlist() {
  if (refresh) await prisma.waitlistEntry.deleteMany({});
  if (await prisma.waitlistEntry.count()) return console.log("Sample waitlist already present.");
  const rand = rng(60);
  const fsas = Object.keys(FSA_TABLE);
  const langWeights: [string, number][] = [["en", 0.35], ["zh", 0.2], ["tl", 0.15], ["es", 0.15], ["fr", 0.15]];
  const pick = () => { let r = rand(); for (const [l, w] of langWeights) { if ((r -= w) < 0) return l; } return "en"; };
  const entries = [];
  for (let i = 1; i <= 60; i++) {
    const joined = daysAgo(3 + rand() * 115);
    const sinceJoin = (now.getTime() - joined.getTime()) / DAY_MS;
    entries.push({
      id: `sample-entry-${String(i).padStart(2, "0")}`, label: `Sample patient ${String(i).padStart(2, "0")}`,
      fsa: fsas[Math.floor(rand() * fsas.length)], language: pick(), channel: rand() < 0.7 ? ("sms" as const) : ("email" as const),
      joinedAt: joined, lastCheckinAt: daysAgo(sinceJoin % 34), status: "waiting" as const, isSample: true,
    });
  }
  await prisma.waitlistEntry.createMany({ data: entries });

  // One finished opening from 6 days ago, so the outbox and status screens are not empty on first load.
  const listing = await prisma.listing.findUnique({ where: { id: "sample-2" } });
  if (listing) {
    const sorted = [...entries].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
      .filter((e) => km(FSA_TABLE[e.fsa], [listing.lat, listing.lng]) <= config.waitlistRadiusKm).slice(0, 2);
    const sentAt = daysAgo(6), respondBy = new Date(sentAt.getTime() + config.offerWindowHours * 36e5);
    for (const [i, e] of sorted.entries()) {
      const accepted = i === sorted.length - 1;
      const full = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: e.id } });
      const offer = await prisma.offer.create({ data: { listingId: listing.id, entryId: e.id, sentAt, respondBy, response: accepted ? "accepted" : "passed" } });
      await prisma.outboxMessage.create({ data: { entryId: e.id, offerId: offer.id, kind: "offer", body: offerBody("offer", full, listing, respondBy), createdAt: sentAt } });
      if (accepted) await prisma.waitlistEntry.update({ where: { id: e.id }, data: { status: "accepted" } });
    }
  }
  console.log("Seeded 60 sample waitlist entries.");
}

async function main() {
  await seedCentroids();
  await seedListings();
  await seedCounts();
  await seedWaitlist();
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
