import type { AgentProposal, Listing } from "@prisma/client";
import { reviewedClinicHosts } from "@/lib/source-trust";
import BatchReview from "@/components/BatchReview";
import { batchEligibility, MAX_REVIEW_BATCH, requireTrustedSource, retrievedDate, sourceHost, reviewVersion, type ReviewListing } from "@/lib/review-policy";
import { reviewInclude } from "@/lib/batch-review";
import AdminNav from "@/components/AdminNav";
import SubmitButton from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { config, fullReportsToHide } from "@/lib/config";
import { prisma } from "@/lib/db";
import { FSA_CODES } from "@/lib/fsa";
import { ageDays } from "@/lib/ranking";
import AgentTrace from "@/components/AgentTrace";
import { noticeMarks, reviewGuide, type Field } from "@/lib/review-guide";
import { approve, approveBatch, intake, listingMarkFull, listingReopen, proposalApprove, proposalFull, proposalReject, proposalReviewAsNew, proposalStillOpen, reject, runExpiry, runFreshness } from "./actions";

export const dynamic = "force-dynamic";

const SOURCES: [string, string][] = [["web", "Clinic website"], ["post", "Community post"], ["list", "Regional list"], ["news", "Clinic newsletter"], ["rev", "Other announcement"]];
const SAMPLE_ANN = "Exciting news! Dr. N. Rahimi is joining Fernleaf Family Practice near Eglinton and Warden next month and will be accepting new patients of all ages. Dr. Rahimi sees patients in English, Farsi and Dari. Call the front desk at 416-555-0145 to get on the list. Please share with anyone who still needs a family doctor!";
type Conf = Record<string, unknown>;
type Check = ReturnType<typeof batchEligibility>;
type Proposal = AgentProposal & { listing: (Listing & { _count: { fullReports: number } }) | null };
const pill = (v: unknown) => { const c = v === "high" || v === "medium" ? v : "low"; return <span className={`conf ${c}`}>{c}</span>; };
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const ACTION: Record<string, string> = { reconfirm_listing: "Re-confirm an existing listing", mark_full: "Mark an existing listing full", no_listing: "Do not list this notice" };
const fromDiscovery = (v: unknown) => !!(v && typeof v === "object" && typeof (v as Conf).check_id === "string");
const Origin = ({ discovery }: { discovery: unknown }) => <span className="tag">{fromDiscovery(discovery) ? "Found by discovery" : "Added by hand"}</span>;

/**
 * The reviewer's inbox. Agents do the reading and checking; a person sees only what needs a person, in three buckets:
 * ① ready to publish (the agent is confident: one click for the batch), ② needs you (each item says why),
 * ③ call the clinic (re-checks, many started by a patient's report). Hand intake, all listings and history sit below, folded.
 */
export default async function Admin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [listings, centroids, decisions, proposals, watched] = await Promise.all([
    prisma.listing.findMany({ include: reviewInclude, orderBy: { createdAt: "desc" } }),
    prisma.fsaCentroid.findMany({ select: { fsa: true } }),
    prisma.reviewDecision.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.agentProposal.findMany({ where: { status: "pending" }, orderBy: [{ priority: "asc" }, { createdAt: "desc" }], include: { listing: { include: { _count: { select: { fullReports: true } } } } } }),
    prisma.discoverySource.count({ where: { status: "active" } }),
  ]);
  const pending = listings.filter((l) => l.status === "pending");
  const rest = listings.filter((l) => l.status !== "pending");
  const now = new Date(), today = day(now);
  const provider = process.env.LLM_PROVIDER || "anthropic";
  const hosts = await reviewedClinicHosts(prisma);
  const trusted = requireTrustedSource();
  const ctx = { listings, fsas: centroids.map((f) => f.fsa), now, hosts, requireTrustedSource: trusted };
  const checks = new Map(pending.map((l) => [l.id, batchEligibility(l, ctx)]));
  const ready = pending.filter((l) => checks.get(l.id)!.eligible);
  const unsure = pending.filter((l) => !checks.get(l.id)!.eligible);
  const rechecks = proposals.filter((p) => p.action === "recheck_listing");
  const updates = proposals.filter((p) => p.action !== "recheck_listing");
  const needs = unsure.length + updates.length;
  const shown = ready.slice(0, MAX_REVIEW_BATCH);

  return (
    <div className="wrap wide stack">
      <AdminNav />
      {sp.msg ? <p className="note ok" role="status">{sp.msg}</p> : null}
      {sp.error ? <p className="note err" role="alert">{sp.error}</p> : null}

      <section className="card stack">
        <div>
          <h1>Inbox</h1>
          <p className="muted">Agents read the notices and check the clinics. You only see what needs a person: one click for listings the agent is sure about, and a short reason for everything else. Nothing reaches patients until you approve it.</p>
        </div>
        <nav className="tiles" aria-label="Inbox">
          <a className={`tile ${ready.length ? "hot" : ""}`} href="#ready"><b>{ready.length}</b>Ready to publish<span className="small muted">The agent is sure</span></a>
          <a className={`tile ${needs ? "hot" : ""}`} href="#needs"><b>{needs}</b>Needs you<span className="small muted">Each one says why</span></a>
          <a className={`tile ${rechecks.length ? "hot" : ""}`} href="#calls"><b>{rechecks.length}</b>Call the clinic<span className="small muted">Mostly from patient reports</span></a>
        </nav>
        <p className="small muted">Where these come from: <a href="/admin/discovery">discovery</a> ({watched} page{watched === 1 ? "" : "s"} watched), notices added by hand below, and patients&apos; reports after they call.</p>
      </section>

      <section className="card step stack" id="ready">
        <h2><span className="stepnum">1</span> Ready to publish <span className="muted small">({ready.length})</span></h2>
        <p className="small muted">The intake agent read each of these with high confidence. The notice&apos;s own wording backs every field, it is dated in the last 14 days, it has a source link, and nothing conflicts with the directory.
          {trusted ? " Only notices from clinic websites a person marked as trusted can be here." : " Prototype setting: any public HTTPS source link counts. A pilot would accept only clinic websites a person marked as trusted (REQUIRE_TRUSTED_CLINIC_SOURCE=true)."}</p>
        {ready.length > MAX_REVIEW_BATCH ? <p className="note">Showing the first {MAX_REVIEW_BATCH}. The rest will be in the next batch.</p> : null}
        {shown.length ? <>
          <BatchReview key={shown.map(reviewVersion).join(":")} action={approveBatch} rows={shown.map((l) => ({
            id: l.id, version: reviewVersion(l), clinic: l.clinic, area: l.area, fsa: l.fsa!, providerType: l.providerType,
            languages: l.languages, phone: l.phone!, sourceUrl: l.sourceUrl!, rawText: l.rawText!,
            date: checks.get(l.id)!.confirmed!.toISOString().slice(0, 10), isSample: l.isSample,
          }))} />
          <details>
            <summary className="small">Edit or reject one of these instead</summary>
            <div className="stack">{shown.map((l) => <ListingReview key={l.id} l={l} check={checks.get(l.id)!} today={today} fsas={ctx.fsas} />)}</div>
          </details>
        </> : <p className="muted">Nothing is ready right now.</p>}
      </section>

      <section className="card step stack" id="needs">
        <h2><span className="stepnum">2</span> Needs you <span className="muted small">({needs})</span></h2>
        <p className="small muted">The agent could not settle these alone. Each one says why. Open it, check the notice, then decide.</p>
        {needs ? null : <p className="muted">Nothing needs you right now.</p>}
        {unsure.map((l) => <ListingReview key={l.id} l={l} check={checks.get(l.id)!} today={today} fsas={ctx.fsas} />)}
        {updates.map((p) => <ProposalCard key={p.id} p={p} today={today} />)}
      </section>

      <section className="card step stack" id="calls">
        <h2><span className="stepnum">3</span> Call the clinic <span className="muted small">({rechecks.length})</span></h2>
        <p className="small muted">The freshness agent writes these as soon as a patient reports that a clinic is full or did not speak their language, and when you check the whole directory. Call, then record what the clinic said. The agent never changes a listing itself.</p>
        {rechecks.length ? null : <p className="muted">No calls waiting.</p>}
        {rechecks.map((p) => <ProposalCard key={p.id} p={p} today={today} />)}
        <form action={runFreshness}><SubmitButton className="btn ghost" pendingText="The freshness agent is checking…">Check the whole directory for stale listings</SubmitButton></form>
      </section>

      <details className="card" id="add">
        <summary><b>Add a notice by hand</b> <span className="muted">(email, flyer, newsletter, community post)</span></summary>
        <form className="stack" action={intake}>
          <p className="small muted">Discovery finds clinic pages and sends their notices to this inbox automatically. Use this for a notice that reached you another way. The intake agent reads it, checks the directory, and puts its proposal in the inbox above. The sample text is invented.</p>
          {provider === "mock" ? <p className="banner">LLM_PROVIDER is &quot;mock&quot;: an offline keyword reader stands in for the AI, and a scripted planner runs the agent&apos;s steps.</p>
            : process.env.AGENT_PLANNER === "scripted" ? <p className="banner">AGENT_PLANNER is &quot;scripted&quot;: the agent&apos;s steps run in a fixed order.</p>
            : provider !== "anthropic" && provider !== "cohere" ? <p className="banner">The agent&apos;s steps are scripted with this provider. The model chooses the steps when LLM_PROVIDER is anthropic or cohere.</p> : null}
          <div><label className="lbl" htmlFor="text">Notice text</label><textarea id="text" name="text" rows={6} required maxLength={6000} defaultValue={SAMPLE_ANN} /></div>
          <div className="grid2">
            <div><label className="lbl" htmlFor="sourceUrl">Source link</label><input type="text" id="sourceUrl" name="sourceUrl" inputMode="url" placeholder="https://" /></div>
            <div><label className="lbl" htmlFor="sourceType">Source type</label><select id="sourceType" name="sourceType" defaultValue="post">{SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <SubmitButton pendingText="The intake agent is reading…">Read this notice</SubmitButton>
        </form>
      </details>

      <details className="card" id="listings">
        <summary><b>All listings</b> <span className="muted">({rest.length}) · put a clinic back, or mark one full</span></summary>
        <div className="stack">
          <p className="small muted">Listings expire {config.expiryDays} days after they were last confirmed. {fullReportsToHide()} separate &quot;full&quot; report{fullReportsToHide() === 1 ? "" : "s"} from patients hide a listing straight away (FULL_REPORTS_TO_HIDE). If a clinic tells you it is taking patients again, put it back here.</p>
          <div className="scroll"><table className="data"><thead><tr><th>Clinic</th><th>Status</th><th>Confirmed</th><th>Expires</th><th>Full reports</th><th></th></tr></thead><tbody>
            {rest.map((l) => {
              const overdue = l.status === "live" && l.expiresAt && l.expiresAt <= now;
              return (
                <tr key={l.id}>
                  <td>{l.clinic} {l.isSample ? <span className="tag">Sample</span> : null}<div className="small muted">{l.area}</div></td>
                  <td><span className={`state ${l.status === "live" ? (overdue ? "soon" : "live") : l.status === "full" ? "full" : "gone"}`}>{overdue ? "live, past date" : l.status}</span></td>
                  <td>{day(l.lastConfirmedAt)}{l.lastConfirmedAt ? <div className="small muted">{ageDays(l.lastConfirmedAt, now)} d old</div> : null}</td>
                  <td>{day(l.expiresAt)}</td>
                  <td className="num">{l._count.fullReports}</td>
                  <td><form><input type="hidden" name="id" value={l.id} />
                    {l.status === "live" && !overdue
                      ? <button className="btn ghost small" type="submit" formAction={listingMarkFull}>Clinic says full</button>
                      : <button className="btn ghost small" type="submit" formAction={listingReopen}>Taking patients again</button>}
                  </form></td>
                </tr>
              );
            })}
          </tbody></table></div>
          <form action={runExpiry}><button className="btn ghost" type="submit">Run the expiry check now</button></form>
        </div>
      </details>

      <details className="card">
        <summary><b>Publication history</b> <span className="muted">({decisions.length} most recent)</span></summary>
        <p className="small muted">Each decision keeps the approved listing snapshots. The shared admin login does not identify an individual reviewer.</p>
        {decisions.length ? decisions.map((d) => <details key={d.id}>
          <summary className="small">{d.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC · {d.mode} · {d.action}</summary>
          <pre className="raw">{JSON.stringify({ actor: d.actor, policy: d.policy, items: d.items }, null, 2)}</pre>
        </details>) : <p className="muted">No decisions recorded yet.</p>}
      </details>
    </div>
  );
}

/** The notice text in a scroll box, with "new patients" wording, phone numbers and the clinic name marked. */
function Notice({ text, clinic }: { text: string; clinic: string }) {
  return <pre className="raw notice">{noticeMarks(text, clinic).map((p, i) => (p.mark ? <mark key={i}>{p.t}</mark> : p.t))}</pre>;
}

/**
 * One pending listing. Collapsed: the clinic and a short "To check" list. Open: the decision on the left (what to check,
 * the fields with the doubtful ones marked, the buttons) and the evidence on the right (the notice, then the agent's notes).
 */
function ListingReview({ l, check, today, fsas }: { l: ReviewListing; check: Check; today: string; fsas: string[] }) {
  const c = (l.confidence ?? {}) as Conf;
  const { todo, flagged, missing } = reviewGuide(l, check.reasons, fsas);
  const unclearProvider = c.provider_type_read === "unknown";
  const discovery = c.discovery as Conf | null | undefined;
  const f = (name: Field) => `field${flagged.has(name) ? " flag" : ""}`;
  // An empty field gets "missing", not the agent's confidence: "high" on a blank box reads as a contradiction.
  const conf = (name: Field, v: unknown) => (missing.has(name) ? <span className="conf low">missing</span> : flagged.has(name) ? pill(v) : null);
  const ready = !check.reasons.length;
  const fetched = retrievedDate(c, new Date())?.toISOString().slice(0, 10);
  return (
    <details className="card review-item" id={`individual-${l.id}`}>
      <summary>
        <span className="review-head"><b>{l.clinic || "Unnamed clinic"}</b> <span className="small muted">{l.area || "no area"}</span>
          {l.isSample ? <span className="tag">Sample</span> : null} <Origin discovery={discovery} /></span>
        {ready ? <span className="small muted" style={{ display: "block" }}>Ready to publish. Edit or reject it here if something is off.</span>
          : <span className="small why-line">To check: {todo.map((t) => t.label).join(" · ")}</span>}
      </summary>
      <form className="review-grid" action={approve}>
        <input type="hidden" name="id" value={l.id} />
        <input type="hidden" name="version" value={reviewVersion(l)} />
        <div className="stack">
          {todo.length ? <div className="todo"><h3 className="small">What to check</h3><ol>{todo.map((t) => <li key={t.label}>{t.text}</li>)}</ol></div> : null}
          <fieldset className="group"><legend className="small">What patients will see</legend>
            <div className="grid2">
              <div className={f("clinic")}><label className="lbl">Clinic<input type="text" name="clinic" defaultValue={l.clinic} required /></label></div>
              <div className={f("phone")}><label className="lbl">Phone<input type="text" name="phone" defaultValue={l.phone ?? ""} /></label></div>
              <div className={f("area")}><label className="lbl">Area {conf("area", c.location)}<input type="text" name="area" defaultValue={l.area} required /></label></div>
              <div className={f("fsa")}><label className="lbl">Postal area {conf("fsa", c.location)}
                <select name="fsa" defaultValue={l.fsa ?? ""} required><option value="">Choose</option>{FSA_CODES.map((x) => <option key={x}>{x}</option>)}</select></label></div>
              <div className={f("providerType")}><label className="lbl">Provider type {conf("providerType", unclearProvider ? "low" : c.provider_type)}
                <select name="providerType" defaultValue={unclearProvider ? "" : l.providerType} required><option value="">Choose</option><option value="family_doctor">Family doctor</option><option value="nurse_practitioner">Nurse practitioner</option></select></label></div>
              <div className={f("languages")}><label className="lbl">Languages {conf("languages", c.languages)}<input type="text" name="languages" defaultValue={l.languages.join(", ")} placeholder="English, French" /></label>
                <span className="small muted">Comma separated. Leave empty if not stated: patients see “Languages not listed. Ask when you call.”</span></div>
            </div>
          </fieldset>
          <fieldset className="group"><legend className="small">Evidence</legend>
            <div className="grid2">
              <div className={f("date")}><label className="lbl">Date you confirm {conf("date", c.date_read ? c.date : "low")}
                <input type="date" name="date" defaultValue={typeof c.date_read === "string" ? c.date_read : fetched ?? ""} max={today} required /></label>
                <span className="small muted">{c.date_read ? "Read from the notice." : fetched ? "The day discovery read the clinic's page. The notice itself has no date." : "No date in the notice. Enter the date you checked."}</span></div>
              <div><label className="lbl">Source type<select name="sourceType" defaultValue={l.sourceType}>{SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>
              <div className={`${f("sourceUrl")} span2`}><label className="lbl">Source link<input type="text" name="sourceUrl" defaultValue={l.sourceUrl ?? ""} /></label></div>
            </div>
          </fieldset>
          <div className="row">
            <button className="btn" type="submit">Approve and publish</button>
            <button className="btn bad" type="submit" formAction={reject} formNoValidate>Reject</button>
          </div>
        </div>
        <aside className="stack evidence-col" aria-label="Evidence">
          <div className="row small">
            <b>The notice</b>
            {sourceHost(l.sourceUrl) ? <a href={l.sourceUrl!} target="_blank" rel="noreferrer noopener">Open the source page</a> : null}
            {discovery && typeof discovery.check_id === "string" ? <a href={`/admin/discovery?check=${discovery.check_id}#evidence-${discovery.check_id}`}>When discovery read it</a> : null}
          </div>
          <Notice text={l.rawText ?? ""} clinic={l.clinic} />
          {Array.isArray(c.filled_from_page) && c.filled_from_page.length ? <p className="small">The agent filled <b>{c.filled_from_page.join(", ")}</b> from the page&apos;s contact details. Check them against the notice.</p> : null}
          {c.agent_rationale || c.notes ? <p className="small muted">{c.agent_rationale ? <>Agent: {String(c.agent_rationale)} </> : null}{c.notes ? <>Note: {String(c.notes)}</> : null}</p> : null}
          <AgentTrace trace={c.agent_trace} />
        </aside>
      </form>
    </details>
  );
}

/** An agent proposal: an update to an existing listing, a "do not list" recommendation, or a clinic re-check call. */
function ProposalCard({ p, today }: { p: Proposal; today: string }) {
  const pl = (p.payload ?? {}) as { confirmed_date?: string | null; call_script?: string; trigger?: string; patient_report?: string; discovery?: unknown };
  const l = p.listing;
  const recheck = p.action === "recheck_listing";
  const byPatient = pl.trigger === "patient_full" || pl.trigger === "patient_language";
  return (
    <details className="card" open={recheck}>
      <summary>
        <b>{recheck ? l?.clinic ?? "A listing" : ACTION[p.action] ?? p.action}</b>{" "}
        {p.priority === "high" ? <span className="prio high">High priority</span> : null}{" "}
        {recheck ? <span className="tag">{byPatient ? "From a patient report" : "Freshness check"}</span> : <Origin discovery={pl.discovery} />}
        {l?.isSample ? <> <span className="tag">Sample</span></> : null}
        <span className="small why-line">{byPatient && pl.patient_report ? `Because: ${pl.patient_report}` : `Why: ${p.rationale}`}</span>
      </summary>
      <form className="stack" action={proposalApprove}>
        <input type="hidden" name="id" value={p.id} />
        {byPatient ? <p className="small">Agent: {p.rationale}</p> : null}
        <p className="small muted">From the {p.agent} agent · {p.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
        {l ? (
          <p className="small"><b>{l.clinic}</b>, {l.area} · {l.phone ?? "no phone"} · {l.status}{l.lastConfirmedAt ? `, confirmed ${day(l.lastConfirmedAt)}` : ""}{l.expiresAt ? `, expires ${day(l.expiresAt)}` : ""} · {l._count.fullReports} full report{l._count.fullReports === 1 ? "" : "s"}</p>
        ) : null}
        {recheck && l?.status === "full" ? <p className="note warn small">Hidden from patients right now because of their reports. If the clinic says it is taking patients, choose “They are still taking patients” and it goes back live from today.</p> : null}
        {pl.call_script ? <div><span className="lbl">Call script</span><pre className="raw">{pl.call_script}</pre></div> : null}
        {p.rawText ? <details><summary className="small muted">The notice</summary><Notice text={p.rawText} clinic={l?.clinic ?? ""} /></details> : null}
        {p.action === "reconfirm_listing" ? (
          <div><label className="lbl">Date you confirm<input type="date" name="date" defaultValue={pl.confirmed_date ?? ""} required max={today} /></label></div>
        ) : null}
        {recheck && l ? (
          <div><label className="lbl">Languages the clinic told you, comma separated (optional; replaces the listed languages)<input type="text" name="languages" defaultValue={l.languages.join(", ")} /></label></div>
        ) : null}
        <AgentTrace trace={p.trace} />
        <div className="row">
          {recheck ? (<>
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
    </details>
  );
}
