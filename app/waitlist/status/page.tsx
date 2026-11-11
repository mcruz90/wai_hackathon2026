import WaitlistShell from "@/components/WaitlistShell";
import { prisma } from "@/lib/db";
import { fill, T } from "@/lib/i18n";
import { parseSearch, searchQuery } from "@/lib/listings";
import { areaStatus } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

export default async function Status({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  const w = T[s.lang], q = searchQuery(s);
  // One sample entry: prefer one in the visitor's area and language, otherwise the longest-waiting sample.
  const entry =
    (await prisma.waitlistEntry.findFirst({ where: { status: "waiting", fsa: s.fsa || undefined, language: s.lang }, orderBy: { joinedAt: "asc" } })) ??
    (await prisma.waitlistEntry.findFirst({ where: { status: "waiting", fsa: s.fsa || undefined }, orderBy: { joinedAt: "asc" } })) ??
    (await prisma.waitlistEntry.findFirst({ where: { status: "waiting" }, orderBy: { joinedAt: "asc" } }));
  const st = entry ? await areaStatus(entry) : null;
  return (
    <WaitlistShell lang={s.lang} back={`/plan?${q}`}>
      <section className="card">
        <h1>{w.wlStatusH}</h1>
        {entry && st ? (
          <>
            <p className="muted small">{fill(w.wlEntry, { fsa: entry.fsa })}</p>
            <p><b>{st.about ? fill(w.wlAbout, { n: st.about }) : w.wlFew}</b></p>
            <p>{st.lastOfferDays === null ? w.wlNever : st.lastOfferDays === 0 ? w.wlLastToday : st.lastOfferDays === 1 ? w.wlLast1 : fill(w.wlLast, { n: st.lastOfferDays })}</p>
            <p className="small muted">{w.wlNoPlace}</p>
          </>
        ) : <p className="muted">—</p>}
      </section>
      <a className="btn ghost" href={`/waitlist/rule?${q}`}>{w.wlRuleLink}</a>
      <a className="btn ghost" href={`/waitlist/outbox?${q}`}>{w.wlOutboxLink}</a>
    </WaitlistShell>
  );
}
