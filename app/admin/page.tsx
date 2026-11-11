import BatchReview from "@/components/BatchReview";
import { batchEligibility, clinicSourceHosts, MAX_REVIEW_BATCH, reviewVersion } from "@/lib/review-policy";
import { reviewInclude } from "@/lib/batch-review";
import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { FSA_CODES } from "@/lib/fsa";
import { ageDays } from "@/lib/ranking";
import AgentTrace from "@/components/AgentTrace";
import { approve, approveBatch, intake, proposalApprove, proposalFull, proposalReject, proposalReviewAsNew, proposalStillOpen, reject, runExpiry, runFreshness } from "./actions";

export const dynamic = "force-dynamic";

const SOURCES: [string, string][] = [["web", "Clinic website"], ["post", "Community post"], ["list", "Regional list"], ["news", "Clinic newsletter"], ["rev", "Other announcement"]];
const SAMPLE_ANN = "Exciting news! Dr. N. Rahimi is joining Fernleaf Family Practice near Eglinton and Warden next month and will be accepting new patients of all ages. Dr. Rahimi sees patients in English, Farsi and Dari. Call the front desk at 416-555-0145 to get on the list. Please share with anyone who still needs a family doctor!";
type Conf = Record<string, unknown>;
const pill = (v: unknown) => { const c = v === "high" || v === "medium" ? v : "low"; return <span className={`conf ${c}`}>{c}</span>; };
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function Admin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [listings, centroids, decisions, proposals] = await Promise.all([
    prisma.listing.findMany({ include: reviewInclude, orderBy: { createdAt: "desc" } }),
    prisma.fsaCentroid.findMany({ select: { fsa: true } }),
    prisma.reviewDecision.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.agentProposal.findMany({ where: { status: "pending" }, orderBy: [{ priority: "asc" }, { createdAt: "desc" }], include: { listing: { include: { _count: { select: { fullReports: true } } } } } }),
  ]);
  const pending = listings.filter((l) => l.status === "pending");
  const rest = listings.filter((l) => l.status !== "pending");
  const now = new Date(), today = day(now);
  const provider = process.env.LLM_PROVIDER || "anthropic";
  const hosts = clinicSourceHosts();
  const ctx = { listings, fsas: centroids.map((f) => f.fsa), now, hosts };
  const checks = new Map(pending.map((l) => [l.id, batchEligibility(l, ctx)]));
  const ready = pending.filter((l) => checks.get(l.id)!.eligible);
  const rechecks = proposals.filter((p) => p.action === "recheck_listing");
  const updates = proposals.filter((p) => p.action !== "recheck_listing");
  const ACTION: Record<string, string> = { reconfirm_listing: "Re-confirm an existing listing", mark_full: "Mark an existing listing full", recheck_listing: "Phone the clinic to re-check", no_listing: "Do not list this announcement" };
  return (
    <div className="wrap wide">
      <AdminNav />
      {sp.msg ? <p className="note ok" role="status">{sp.msg}</p> : null}
      {sp.error ? <p className="note err" role="alert">{sp.error}</p> : null}

      <section className="card">
        <h1>Human review</h1>
        <p>Agents prepare the evidence. You authorize publication in batches and investigate exceptions individually.</p>
        <nav className="row" aria-label="Review queues">
          <a href="#batch">Ready for batch review ({ready.length})</a>
          <a href="#review">Needs investigation ({pending.length - ready.length + updates.length})</a>
          <a href="#clinic-checks">Needs clinic confirmation ({rechecks.length})</a>
        </nav>
      </section>
      <form className="card" action={intake}>
        <h2>Intake</h2>
        <p className="muted small">Paste one public announcement and its link. The intake agent reads it into fields, checks whether the clinic is already listed, and proposes a new listing, an update, or not listing it. Nothing is published until a reviewer approves it below. The demo text is invented.</p>
        {provider === "mock" ? <p className="banner">LLM_PROVIDER is "mock": an offline keyword reader stands in for the AI, and a scripted planner runs the agent's steps. Set a real provider and key for real reads.</p> : provider !== "anthropic" ? <p className="banner">The agent's steps are scripted with this provider. Claude chooses the steps when LLM_PROVIDER is anthropic.</p> : null}
        <div><label className="lbl" htmlFor="text">Announcement text</label><textarea id="text" name="text" rows={6} required maxLength={6000} defaultValue={SAMPLE_ANN} /></div>
        <div className="grid2">
          <div><label className="lbl" htmlFor="sourceUrl">Source link</label><input type="text" id="sourceUrl" name="sourceUrl" inputMode="url" placeholder="https://" /></div>
          <div><label className="lbl" htmlFor="sourceType">Source type</label><select id="sourceType" name="sourceType" defaultValue="post">{SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <button className="btn" type="submit">Read announcement</button>
      </form>

      <section className="stack" id="batch">
        <h2>Ready for batch review ({ready.length})</h2>
        {!hosts.length ? <p className="note">No clinic source hosts have been configured. Listings remain available for individual review. A pilot administrator can configure approved clinic websites before using batch publication.</p> : null}
        {ready.length > MAX_REVIEW_BATCH ? <p className="note">Showing the first {MAX_REVIEW_BATCH} eligible listings. Remaining listings will be available in the next batch.</p> : null}
        {ready.length ? <BatchReview key={ready.slice(0, MAX_REVIEW_BATCH).map(reviewVersion).join(":")} action={approveBatch} rows={ready.slice(0, MAX_REVIEW_BATCH).map((l) => ({
          id: l.id, version: reviewVersion(l), clinic: l.clinic, area: l.area, fsa: l.fsa!, providerType: l.providerType,
          languages: l.languages, phone: l.phone!, sourceUrl: l.sourceUrl!, rawText: l.rawText!,
          date: checks.get(l.id)!.confirmed!.toISOString().slice(0, 10), isSample: l.isSample,
        }))} /> : <p className="muted">No listings currently pass every batch check.</p>}
      </section>

      <section className="stack" id="review">
        <h2>Individual listing review ({pending.length})</h2>
        <p className="small muted">Exceptions need investigation. Batch candidates can also be edited or rejected here.</p>
        {pending.length ? null : <p className="muted">Nothing is waiting for review.</p>}
        {pending.map((l) => {
          const c = (l.confidence ?? {}) as Conf;
          const unclearProvider = c.provider_type_read === "unknown";
          const reasons = checks.get(l.id)!.reasons;
          const notAccepting = c.accepting !== "yes";
          return (
            <details className="card" key={l.id} id={`individual-${l.id}`} open={!checks.get(l.id)!.eligible}>
              <summary><b>{l.clinic || "Unnamed clinic"}</b> {l.isSample ? <span className="tag">Sample</span> : null} · {checks.get(l.id)!.eligible ? "Batch candidate" : "Needs investigation"}</summary>
            <form className="stack" action={approve}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="version" value={reviewVersion(l)} />
              <div className="review">
                <b>{notAccepting ? "Do not publish unless you have checked" : reasons.length ? "Held for human review" : "Read with confidence. Still needs your approval"}</b>
                <span className="small">
                  {notAccepting ? `The announcement does not clearly say the clinic is taking new patients (the AI read: ${String(c.accepting ?? "unclear")}). ` : ""}
                  {reasons.length ? `Why: ${reasons.join("; ")}.` : notAccepting ? "" : "Check each field against the text, then approve."}
                </span>
                {c.notes ? <span className="small muted">AI note: {String(c.notes)}</span> : null}
                {c.agent_rationale ? <span className="small muted">Agent: {String(c.agent_rationale)}</span> : null}
              </div>
              <AgentTrace trace={c.agent_trace} />
              <details open><summary className="small muted">Announcement as pasted</summary><pre className="raw">{l.rawText}</pre></details>
              <div className="grid2">
                <div><label className="lbl">Clinic<input type="text" name="clinic" defaultValue={l.clinic} required /></label></div>
                <div><label className="lbl">Area {pill(c.location)}<input type="text" name="area" defaultValue={l.area} required /></label></div>
                <div><label className="lbl">Postal area {pill(c.location)}
                  <select name="fsa" defaultValue={l.fsa ?? ""} required><option value="">Choose</option>{FSA_CODES.map((f) => <option key={f}>{f}</option>)}</select></label></div>
                <div><label className="lbl">Provider type {pill(unclearProvider ? "low" : c.provider_type)}
                  <select name="providerType" defaultValue={unclearProvider ? "" : l.providerType} required><option value="">Choose</option><option value="family_doctor">Family doctor</option><option value="nurse_practitioner">Nurse practitioner</option></select></label></div>
                <div><label className="lbl">Languages, comma separated {pill(c.languages)}<input type="text" name="languages" defaultValue={l.languages.join(", ")} required /></label></div>
                <div><label className="lbl">Phone<input type="text" name="phone" defaultValue={l.phone ?? ""} /></label></div>
                <div><label className="lbl">Date you confirm {pill(c.date_read ? c.date : "low")}
                  <input type="date" name="date" defaultValue={typeof c.date_read === "string" ? c.date_read : ""} max={today} required /></label>
                  <span className="small muted">{c.date_read ? "Read from the text." : "The AI found no date. Enter the date you checked it."}</span></div>
                <div><label className="lbl">Source type<select name="sourceType" defaultValue={l.sourceType}>{SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>
                <div><label className="lbl">Source link<input type="text" name="sourceUrl" defaultValue={l.sourceUrl ?? ""} /></label></div>
              </div>
              <div className="row">
                <button className="btn" type="submit">Approve and publish</button>
                <button className="btn bad" type="submit" formAction={reject} formNoValidate>Reject</button>
              </div>
            </form>
            </details>
          );
        })}
      </section>

      {[{ id: "proposals", title: "Proposals needing investigation", rows: updates }, { id: "clinic-checks", title: "Needs clinic confirmation", rows: rechecks }].map((queue) => (
      <section className="stack" id={queue.id} key={queue.id}>
        <h2>{queue.title} ({queue.rows.length})</h2>
        {queue.id === "clinic-checks" ? <div className="card">
          <p className="small muted">The freshness agent runs every night. It looks for live listings that expire within 10 days or that a patient reported full, and asks you to phone the clinic. It never changes a listing itself.</p>
          <form action={runFreshness}><button className="btn ghost" type="submit">Run freshness agent now</button></form>
        </div> : null}
        {queue.rows.length ? null : <p className="muted">No proposals are waiting.</p>}
        {queue.rows.map((p) => {
          const pl = (p.payload ?? {}) as { confirmed_date?: string | null; call_script?: string };
          const l = p.listing;
          return (
            <form className="card" key={p.id} action={proposalApprove}>
              <input type="hidden" name="id" value={p.id} />
              <div className="review">
                <b>{ACTION[p.action] ?? p.action} {p.priority === "high" ? <span className="prio high">High priority</span> : null}</b>
                <span className="small">{p.rationale}</span>
                <span className="small muted">From the {p.agent} agent · {p.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
              </div>
              {l ? (
                <p className="small"><b>{l.clinic}</b>, {l.area} · {l.phone ?? "no phone"} · {l.status}{l.lastConfirmedAt ? `, confirmed ${day(l.lastConfirmedAt)}` : ""}{l.expiresAt ? `, expires ${day(l.expiresAt)}` : ""} · {l._count.fullReports} full report{l._count.fullReports === 1 ? "" : "s"} {l.isSample ? <span className="tag">Sample</span> : null}</p>
              ) : null}
              {pl.call_script ? <div><span className="lbl">Call script</span><pre className="raw">{pl.call_script}</pre></div> : null}
              {p.rawText ? <details><summary className="small muted">Announcement as pasted</summary><pre className="raw">{p.rawText}</pre></details> : null}
              {p.action === "reconfirm_listing" ? (
                <div><label className="lbl">Date you confirm<input type="date" name="date" defaultValue={pl.confirmed_date ?? ""} required max={today} /></label></div>
              ) : null}
              <AgentTrace trace={p.trace} />
              <div className="row">
                {p.action === "recheck_listing" ? (<>
                  <button className="btn" type="submit" formAction={proposalStillOpen}>They are still taking patients</button>
                  <button className="btn bad" type="submit" formAction={proposalFull}>They are full</button>
                  <button className="btn ghost" type="submit" formAction={proposalReject} formNoValidate>Dismiss</button>
                </>) : p.action === "no_listing" ? (<>
                  <button className="btn" type="submit" formAction={proposalApprove}>Agree: do not list</button>
                  <button className="btn ghost" type="submit" formAction={proposalReviewAsNew}>Review it as a new listing</button>
                </>) : (<>
                  <button className="btn" type="submit" formAction={proposalApprove}>{p.action === "mark_full" ? "Approve: mark full" : "Approve: re-confirm"}</button>
                  <button className="btn bad" type="submit" formAction={proposalReject} formNoValidate>Reject</button>
                </>)}
              </div>
            </form>
          );
        })}
      </section>
      ))}

      <section className="card">
        <h2>Recent publication decisions</h2>
        <p className="small muted">Decisions retain the approved listing snapshots. The shared admin login does not identify an individual reviewer.</p>
        {decisions.length ? decisions.map((d) => <details key={d.id}>
          <summary>{d.mode} · {d.action} · {d.createdAt.toISOString()} · {d.id}</summary>
          <pre className="raw">{JSON.stringify({ actor: d.actor, policy: d.policy, items: d.items }, null, 2)}</pre>
        </details>) : <p className="muted">No publication decisions recorded yet.</p>}
      </section>

      <section className="card">
        <h2>Listings</h2>
        <p className="small muted">Listings expire {config.expiryDays} days after they were last confirmed (EXPIRY_DAYS). The nightly job marks them expired; you can also run it now.</p>
        <form action={runExpiry}><button className="btn ghost" type="submit">Run expiry job now</button></form>
        <div className="scroll"><table className="data"><thead><tr><th>Clinic</th><th>Status</th><th>Confirmed</th><th>Expires</th><th>Full reports</th><th></th></tr></thead><tbody>
          {rest.map((l) => {
            const overdue = l.status === "live" && l.expiresAt && l.expiresAt <= now;
            return (
              <tr key={l.id}>
                <td>{l.clinic}<div className="small muted">{l.area}</div></td>
                <td><span className={`state ${l.status === "live" ? (overdue ? "soon" : "live") : l.status === "full" ? "full" : "gone"}`}>{overdue ? "live, past date" : l.status}</span></td>
                <td>{day(l.lastConfirmedAt)}{l.lastConfirmedAt ? <div className="small muted">{ageDays(l.lastConfirmedAt, now)} d old</div> : null}</td>
                <td>{day(l.expiresAt)}</td>
                <td className="num">{l._count.fullReports}</td>
                <td>{l.isSample ? <span className="tag">Sample</span> : null}</td>
              </tr>
            );
          })}
        </tbody></table></div>
      </section>
    </div>
  );
}
