import SubmitButton from "@/components/SubmitButton";
import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addSource, addStarterSources, approveSource, checkNow, offlineDemo, pauseSource, rejectSource, searchNow } from "./actions";

export const dynamic = "force-dynamic";

/** "Nov 13, 5:03 p.m." in Toronto time; "never" for no date. */
const when = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }).format(d) : "never";

const RESULT: Record<string, string> = {
  proposed: "Agent wrote a proposal",
  unchanged: "No change since last check",
  skipped: "Read: no new-patient notice found",
  links_only: "Directory read: its links went to step 2",
  error: "Could not be read",
};

function Flash({ sp }: { sp: { msg?: string; error?: string } }) {
  return <>
    {sp.msg ? <p role="status" className="note ok">{sp.msg}</p> : null}
    {sp.error ? <p role="alert" className="note err">{sp.error}</p> : null}
  </>;
}

/**
 * Discovery, as three steps: ① find pages (web search or the starter list), ② a person approves pages
 * for monitoring, ③ check approved pages: changed text goes to the intake agent, which writes proposals
 * that a person reviews on /admin. Nothing here publishes a listing.
 */
export default async function Discovery({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string; check?: string; at?: string }> }) {
  await requireAdmin("/admin/discovery");
  const sp = await searchParams;
  const now = new Date();
  const [pending, active, counts, checks, searchState, proposalsWaiting, listingsWaiting] = await Promise.all([
    prisma.discoverySource.findMany({ where: { status: "pending" }, orderBy: [{ isSample: "asc" }, { createdAt: "desc" }], take: 60 }),
    prisma.discoverySource.findMany({ where: { status: "active" }, orderBy: { reviewedAt: "desc" }, take: 60 }),
    prisma.discoverySource.groupBy({ by: ["status"], _count: true }),
    prisma.discoveryCheck.findMany({ include: { source: true }, orderBy: { retrievedAt: "desc" }, take: 15 }),
    prisma.discoverySearchState.findUnique({ where: { id: "ontario" } }),
    prisma.agentProposal.count({ where: { status: "pending" } }),
    prisma.listing.count({ where: { status: "pending" } }),
  ]);
  const waiting = proposalsWaiting + listingsWaiting;
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const fromLink = (s: { foundBy: string }) => s.foundBy.startsWith("link:");
  const realPending = pending.filter((s) => !s.isSample && !fromLink(s));
  const linkPending = pending.filter((s) => !s.isSample && fromLink(s));
  const samplePending = pending.filter((s) => s.isSample);
  const lastCheckBySource = new Map<string, (typeof checks)[number]>();
  for (const c of checks) if (!lastCheckBySource.has(c.sourceId)) lastCheckBySource.set(c.sourceId, c);
  const due = active.filter((s) => !s.isSample && s.nextCheckAt <= now).length;

  const provider = process.env.DISCOVERY_SEARCH_PROVIDER;
  const searchReady = !searchState || searchState.nextSearchAt <= now;
  const searchStatus = provider === "tavily"
    ? (!process.env.TAVILY_API_KEY ? "Tavily is selected but has no API key on the server." : searchReady ? "Tavily web search · 1 search available now (up to 3 queries)." : `Tavily web search · today's search is used. Next one: ${when(searchState!.nextSearchAt)}.`)
    : provider === "mock" ? "Mock search · offline sample results, no Tavily calls, no daily limit."
    : "Web search is off. Use the starter list or add a page by URL.";

  return <main className="wrap wide stack">
    <AdminNav />
    <div>
      <h1>Discover clinics across Ontario</h1>
      <p className="muted">Find clinic pages, approve the ones worth watching, and let the intake agent read them when they change. Every proposal still waits for a person in <a href="/admin">Intake and review</a>.</p>
    </div>
    {!sp.at ? <Flash sp={sp} /> : null}

    <section className="card step" id="find">
      <h2><span className="stepnum">1</span> Find pages</h2>
      {sp.at === "find" ? <Flash sp={sp} /> : null}
      <p className="small muted">{searchStatus}{searchState?.lastError ? ` Last error: ${searchState.lastError}` : ""}</p>
      <div className="row">
        <form action={searchNow}><SubmitButton pendingText="Searching…" disabled={provider !== "tavily" && provider !== "mock"}>Search the web</SubmitButton></form>
        <form action={addStarterSources}><SubmitButton className="btn ghost" pendingText="Adding…">Add the Ontario starter list</SubmitButton></form>
      </div>
      <details>
        <summary className="small">Add a page by URL</summary>
        <form className="stack" action={addSource}>
          <label className="lbl">Public page URL<input type="text" name="url" placeholder="https://clinic.example/new-patients" required maxLength={2000} /></label>
          <label className="lbl">Name (optional)<input type="text" name="title" maxLength={300} /></label>
          <button className="btn ghost" type="submit">Add to step 2</button>
        </form>
      </details>
      <p className="small muted">Found pages are not read yet. Social posts, login-only and JavaScript-only pages are never collected.</p>
    </section>

    <section className="card step" id="review">
      <h2><span className="stepnum">2</span> Approve pages to watch <span className="muted small">({realPending.length + linkPending.length} waiting)</span></h2>
      {sp.at === "review" ? <Flash sp={sp} /> : null}
      <p className="small muted">Open each page first. Approve it as a <b>clinic page</b> (an announcement or registration page) or a <b>directory</b> (only its links are followed). Approving does not fetch or publish anything.</p>
      {!realPending.length && !linkPending.length ? <p className="muted">Nothing waiting. Use step 1 to find pages.</p> : null}
      <ul className="srclist">
        {realPending.map((s) => <SourceRow key={s.id} s={s} />)}
      </ul>
      {linkPending.length ? <details>
        <summary className="small">Links found on pages the agent read ({linkPending.length})</summary>
        <ul className="srclist">{linkPending.map((s) => <SourceRow key={s.id} s={s} />)}</ul>
      </details> : null}
      {samplePending.length ? <details>
        <summary className="small">Sample leads from mock search or the offline demo ({samplePending.length})</summary>
        <ul className="srclist">{samplePending.map((s) => <SourceRow key={s.id} s={s} />)}</ul>
      </details> : null}
    </section>

    <section className="card step" id="check">
      <h2><span className="stepnum">3</span> Check approved pages <span className="muted small">({active.length} approved · {due} due now)</span></h2>
      {sp.at === "check" ? <Flash sp={sp} /> : null}
      <p className="small muted">Fetches up to 3 approved pages that are due. When a page&apos;s text is new or changed, the <b>intake agent</b> reads it, checks the directory, and writes a proposal. An unchanged page creates nothing.</p>
      <div className="row">
        <form action={checkNow}><SubmitButton pendingText="Checking pages… the agent may take a minute" disabled={!due}>Check approved pages now</SubmitButton></form>
        <a className="btn ghost" href="/admin#batch">Review proposals ({waiting} waiting) →</a>
      </div>
      {active.length ? <table className="data compact">
        <thead><tr><th>Page</th><th>Last checked</th><th>Result</th><th></th></tr></thead>
        <tbody>{active.map((s) => {
          const c = lastCheckBySource.get(s.id);
          return <tr key={s.id}>
            <td><a href={s.url} target="_blank" rel="noreferrer">{nameOf(s)}</a> {s.isSample ? <span className="tag">Sample</span> : null}<div className="small muted">{s.kind === "directory" ? "Directory" : "Clinic page"} · next check {s.nextCheckAt <= now ? "due now" : when(s.nextCheckAt)}</div></td>
            <td className="small">{when(s.lastCheckedAt)}</td>
            <td className="small">{s.lastError ? <span className="err">{s.lastError}</span> : c ? <>{RESULT[c.status] ?? c.status}{c.outcomeId ? <> · <a href={c.outcomeKind === "listing" ? `/admin#individual-${c.outcomeId}` : "/admin#proposals"}>open</a></> : null}</> : "Not checked yet"}</td>
            <td><form action={pauseSource}><input type="hidden" name="id" value={s.id} /><button className="btn link small" type="submit">Stop watching</button></form></td>
          </tr>;
        })}</tbody>
      </table> : <p className="muted">No approved pages yet. Approve one in step 2.</p>}
    </section>

    <details className="card" id="evidence">
      <summary><b>What the agent read</b> <span className="muted small">(last {checks.length} page checks)</span></summary>
      {!checks.length ? <p className="muted">No pages have been read yet.</p> : null}
      {checks.map((c) => <article className="stack evidence" key={c.id}>
        <h3>{nameOf({ title: c.title, url: c.sourceUrl, host: c.source.host })} {c.source.isSample ? <span className="tag">Sample</span> : null}</h3>
        <p className="small"><a className="source-url" href={c.sourceUrl} target="_blank" rel="noreferrer">{c.sourceUrl}</a></p>
        <p className="small">Read {when(c.retrievedAt)} · Date on the page: {c.publishedDate ?? "not stated"} · {RESULT[c.status] ?? c.status}{c.outcomeId ? <> · <a href={c.outcomeKind === "listing" ? `/admin#individual-${c.outcomeId}` : "/admin#proposals"}>open the proposal</a></> : null}</p>
        {c.error ? <p className="note err">{c.error}</p> : null}
        <details><summary className="small">Text excerpt</summary><pre className="raw">{c.excerpt}</pre><p className="mono small">{c.contentHash}</p></details>
      </article>)}
    </details>

    <details className="card">
      <summary><b>Try it offline</b> <span className="muted small">(an invented Ottawa clinic, no network or AI calls)</span></summary>
      <p className="small muted">Run once to add the sample page to step 2, approve it, then run again to prepare a sample proposal.</p>
      <form action={offlineDemo}><SubmitButton className="btn ghost" pendingText="Preparing…">Run the offline demo</SubmitButton></form>
    </details>

    <p className="small muted">Stopped: {count("paused")} · Rejected: {count("rejected")}. Scheduled checks: {process.env.DISCOVERY_ENABLED === "true" ? "on" : "off"}.</p>
  </main>;
}

type Source = Awaited<ReturnType<typeof prisma.discoverySource.findMany>>[number];

/** A readable name: the page title without any markup, else the address without the scheme. */
function nameOf(s: { title: string | null; url: string; host: string }) {
  const t = (s.title ?? "").replace(/<[^>]*>?/g, " ").replace(/\s+/g, " ").trim();
  if (t) return t;
  const u = new URL(s.url);
  return `${u.hostname}${u.pathname === "/" ? "" : u.pathname}`;
}
const FOUND_BY: Record<string, string> = { starter_catalog: "starter list", search: "web search", manual: "added by hand", offline_demo: "offline demo" };

/** One page waiting for review: open it, choose clinic page or directory, confirm, approve or reject. */
function SourceRow({ s }: { s: Source }) {
  const guessDirectory = /directory|find-family-doctor|looking-for/i.test(`${s.title} ${s.url}`);
  return <li className="srcrow" id={`source-${s.id}`}>
    <div className="srcinfo">
      <b>{nameOf(s)}</b> {s.isSample ? <span className="tag">Sample</span> : null}
      <div className="small"><a className="source-url" href={s.url} target="_blank" rel="noreferrer">{s.host} ↗</a> <span className="muted">· found by {s.foundBy.startsWith("link:") ? "a link on a page the agent read" : FOUND_BY[s.foundBy] ?? s.foundBy}</span></div>
    </div>
    {s.kind === "social" ? <p className="small note">Social post: add the clinic&apos;s own page instead.</p> :
    <form className="srcform" action={approveSource}>
      <input type="hidden" name="id" value={s.id} />
      <select name="kind" required defaultValue={guessDirectory ? "directory" : "clinic"} aria-label="Page type">
        <option value="clinic">Clinic page</option>
        <option value="directory">Directory</option>
      </select>
      <label className="checkline small"><input type="checkbox" name="authorize" value="yes" required />I opened it and it is a public clinic page</label>
      {!s.isSample ? <details className="small"><summary>Batch option</summary>
        <label className="checkline small"><input type="checkbox" name="trustedClinic" value="yes" />This is the clinic&apos;s own website, so its clean new listings may go to batch review. Directories and shared hosts do not qualify.</label>
      </details> : null}
      <button className="btn" type="submit">Approve</button>
    </form>}
    <form action={rejectSource}><input type="hidden" name="id" value={s.id} /><button className="btn ghost small" type="submit">Reject</button></form>
  </li>;
}
