/**
 * Waitlist concept. Simulation only: every entry is a sample row, and "messages"
 * are rows in outbox_messages that are never delivered anywhere.
 *
 * Ordering rule: waiting entries within WAITLIST_RADIUS_KM of the clinic, oldest
 * joined_at first, OFFER_BATCH_SIZE at a time. A pass or an expired reply window
 * moves the offer to the next person and leaves the first person where they were.
 */
import type { Listing, Offer, WaitlistEntry } from "@prisma/client";
import { prisma } from "./db";
import { config, DAY_MS } from "./config";
import { FSA_TABLE, km } from "./fsa";
import { asLang, fill, T } from "./i18n";

const HOUR_MS = 36e5;
export const CHECKIN_DAYS = 30;

export function entriesNear(entries: WaitlistEntry[], at: [number, number], radiusKm = config.waitlistRadiusKm): WaitlistEntry[] {
  return entries.filter((e) => FSA_TABLE[e.fsa] && km(FSA_TABLE[e.fsa], at) <= radiusKm);
}

function longDate(lang: string, d: Date): string {
  return new Intl.DateTimeFormat(T[asLang(lang)].loc, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }).format(d);
}

export function offerBody(kind: "offer" | "reminder", entry: WaitlistEntry, listing: Listing, respondBy: Date): string {
  const w = T[asLang(entry.language)];
  return fill(kind === "offer" ? w.mOffer : w.mReminder, { clinic: listing.clinic, area: listing.area, date: longDate(entry.language, respondBy) });
}

/** Next people in line for this clinic who have not already been offered it. */
async function nextInLine(listing: Listing, n: number): Promise<WaitlistEntry[]> {
  const already = await prisma.offer.findMany({ where: { listingId: listing.id }, select: { entryId: true } });
  const waiting = await prisma.waitlistEntry.findMany({
    where: { status: "waiting", id: { notIn: already.map((o) => o.entryId) } },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
  });
  return entriesNear(waiting, [listing.lat, listing.lng]).slice(0, n);
}

async function sendOffers(listing: Listing, entries: WaitlistEntry[], now: Date): Promise<number> {
  const respondBy = new Date(now.getTime() + config.offerWindowHours * HOUR_MS);
  for (const entry of entries) {
    const offer = await prisma.offer.create({ data: { listingId: listing.id, entryId: entry.id, sentAt: now, respondBy } });
    await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: "offered" } });
    await prisma.outboxMessage.create({ data: { entryId: entry.id, offerId: offer.id, kind: "offer", body: offerBody("offer", entry, listing, respondBy), createdAt: now } });
  }
  return entries.length;
}

/** Admin action: pretend this clinic has one open spot and offer it to the first batch. */
export async function simulateOpening(listingId: string, now = new Date()): Promise<{ offered: number; alreadyOpen: boolean }> {
  const listing = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
  const open = await prisma.offer.count({ where: { listingId, response: null } });
  if (open) return { offered: 0, alreadyOpen: true };
  return { offered: await sendOffers(listing, await nextInLine(listing, config.offerBatchSize), now), alreadyOpen: false };
}

/** Records a reply. accepted closes the opening; passed or no_reply moves the offer to the next person. */
export async function respondToOffer(offerId: string, response: "accepted" | "passed" | "no_reply", now = new Date()): Promise<void> {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { listing: true } });
  if (!offer || offer.response) return;
  await prisma.offer.update({ where: { id: offer.id }, data: { response } });
  if (response === "accepted") {
    await prisma.waitlistEntry.update({ where: { id: offer.entryId }, data: { status: "accepted" } });
    const others = await prisma.offer.findMany({ where: { listingId: offer.listingId, response: null } });
    for (const o of others) {
      await prisma.offer.update({ where: { id: o.id }, data: { response: "closed" } });
      await prisma.waitlistEntry.update({ where: { id: o.entryId }, data: { status: "waiting" } });
    }
    return;
  }
  // Back to waiting with the same joined_at, so their place in line does not change.
  await prisma.waitlistEntry.update({ where: { id: offer.entryId }, data: { status: "waiting" } });
  await sendOffers(offer.listing, await nextInLine(offer.listing, 1), now);
}

/** Scheduled job: reminders, expired reply windows, and 30-day check-ins. */
export async function runWaitlistJob(now = new Date()): Promise<{ reminders: number; expired: number; checkins: number }> {
  let reminders = 0, expired = 0, checkins = 0;

  const open: (Offer & { listing: Listing; entry: WaitlistEntry; messages: { kind: string }[] })[] = await prisma.offer.findMany({
    where: { response: null }, include: { listing: true, entry: true, messages: { select: { kind: true } } }, orderBy: { sentAt: "asc" },
  });
  for (const o of open) {
    if (o.respondBy <= now) { await respondToOffer(o.id, "no_reply", now); expired++; continue; }
    const half = new Date((o.sentAt.getTime() + o.respondBy.getTime()) / 2);
    if (now >= half && !o.messages.some((m) => m.kind === "reminder")) {
      await prisma.outboxMessage.create({ data: { entryId: o.entryId, offerId: o.id, kind: "reminder", body: offerBody("reminder", o.entry, o.listing, o.respondBy), createdAt: now } });
      reminders++;
    }
  }

  const due = await prisma.waitlistEntry.findMany({ where: { status: "waiting", lastCheckinAt: { lte: new Date(now.getTime() - CHECKIN_DAYS * DAY_MS) } } });
  for (const e of due) {
    await prisma.outboxMessage.create({ data: { entryId: e.id, kind: "checkin", body: T[asLang(e.language)].mCheckin, createdAt: now } });
    await prisma.waitlistEntry.update({ where: { id: e.id }, data: { lastCheckinAt: now } });
    checkins++;
  }
  return { reminders, expired, checkins };
}

/** For the status screen. Deliberately coarse: a rounded count and a day count, never a position. */
export async function areaStatus(entry: WaitlistEntry, now = new Date()): Promise<{ about: number | null; lastOfferDays: number | null }> {
  const at = FSA_TABLE[entry.fsa];
  if (!at) return { about: null, lastOfferDays: null };
  const active = await prisma.waitlistEntry.findMany({ where: { status: { in: ["waiting", "offered"] } } });
  const n = entriesNear(active, at).length;
  const offers = await prisma.offer.findMany({ include: { listing: true }, orderBy: { sentAt: "desc" }, take: 200 });
  const last = offers.find((o) => km([o.listing.lat, o.listing.lng], at) <= config.waitlistRadiusKm);
  return {
    about: n < 5 ? null : Math.round(n / 5) * 5,
    lastOfferDays: last ? Math.max(0, Math.floor((now.getTime() - last.sentAt.getTime()) / DAY_MS)) : null,
  };
}
