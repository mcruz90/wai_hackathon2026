import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { EN_NAME, type Lang } from "@/lib/i18n";
import { liveWhere } from "@/lib/listings";
import { entriesNear } from "@/lib/waitlist";
import { answerOffer, openSpot, runWaitlist } from "../actions";

export const dynamic = "force-dynamic";
const when = (d: Date) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(d);

export default async function WaitlistAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("/admin/waitlist");
  const sp = await searchParams;
  const [listings, waiting, offers, counts] = await Promise.all([
    prisma.listing.findMany({ where: liveWhere(), orderBy: { clinic: "asc" } }),
    prisma.waitlistEntry.findMany({ where: { status: "waiting" } }),
    prisma.offer.findMany({ include: { listing: true, entry: true }, orderBy: [{ sentAt: "desc" }, { id: "desc" }], take: 40 }),
    prisma.waitlistEntry.groupBy({ by: ["status"], _count: true }),
  ]);
  const openListing = new Set(offers.filter((o) => !o.response).map((o) => o.listingId));
  return (
    <div className="wrap wide">
      <AdminNav />
      <div className="banner">Concept, sample patients. This is a simulation of how a partner's own waitlist could work. No real person is on it and no message is sent.</div>
      {sp.msg ? <p className="note ok" role="status">{sp.msg}</p> : null}
      {sp.error ? <p className="note err" role="alert">{sp.error}</p> : null}
      <div><h1>Waitlist concept</h1>
        <p className="muted">Rule: within {config.waitlistRadiusKm} km of the clinic, earliest joined first, {config.offerBatchSize} at a time, {config.offerWindowHours} hours to reply.{" "}
          <a href="/waitlist/rule">Plain-language rule</a> · <a href="/waitlist/outbox">Outbox</a> · <a href="/waitlist/status">Sample status screen</a></p>
        <p className="small muted">Sample entries: {counts.map((c) => `${c._count} ${c.status}`).join(", ")}.</p></div>

      <section className="card">
        <h2>Simulate an opening</h2>
        <div className="scroll"><table className="data"><thead><tr><th>Clinic</th><th className="num">Waiting within range</th><th></th></tr></thead><tbody>
          {listings.map((l) => (
            <tr key={l.id}><td>{l.clinic}<div className="small muted">{l.area}</div></td>
              <td className="num">{entriesNear(waiting, [l.lat, l.lng]).length}</td>
              <td>{openListing.has(l.id) ? <span className="state soon">Offer round open</span>
                : <form action={openSpot}><input type="hidden" name="listingId" value={l.id} /><button className="btn ghost" type="submit">Simulate an opening</button></form>}</td></tr>
          ))}
        </tbody></table></div>
      </section>

      <section className="card">
        <h2>Offers</h2>
        <p className="small muted">Play the sample patient: accept, pass, or let the reply window run out. A pass or a missed window moves the offer to the next person and leaves this person where they were in line.</p>
        <form action={runWaitlist}><button className="btn ghost" type="submit">Run check-in job now</button></form>
        <div className="scroll"><table className="data"><thead><tr><th>Sample entry</th><th>Clinic</th><th>Sent</th><th>Reply by</th><th>Result</th></tr></thead><tbody>
          {offers.map((o) => (
            <tr key={o.id}>
              <td>{o.entry.label}<div className="small muted">{o.entry.fsa} · {EN_NAME[o.entry.language as Lang]} · joined {o.entry.joinedAt.toISOString().slice(0, 10)}</div></td>
              <td>{o.listing.clinic}</td><td>{when(o.sentAt)}</td><td>{when(o.respondBy)}</td>
              <td>{o.response ? <span className={`state ${o.response === "accepted" ? "live" : "gone"}`}>{o.response.replace("_", " ")}</span> : (
                <form action={answerOffer} className="row"><input type="hidden" name="offerId" value={o.id} />
                  <button className="btn link" name="response" value="accepted">Accept</button>
                  <button className="btn link" name="response" value="passed">Pass</button>
                  <button className="btn link" name="response" value="no_reply">Window runs out</button></form>)}</td>
            </tr>
          ))}
        </tbody></table></div>
      </section>
    </div>
  );
}
