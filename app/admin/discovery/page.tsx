import SubmitButton from "@/components/SubmitButton";
import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AgentTrace from "@/components/AgentTrace";
import { requireTrustedSource } from "@/lib/review-policy";
import { after } from "next/server";
import { sortQueueInBackground, triageRunning } from "@/lib/agent/triage";
import { addSource, addStarterSources, approveSource, checkNow, offlineDemo, pauseSource, rejectSource, searchNow, sortNow, undoTriage } from "./actions";

export const dynamic = "force-dynamic";

/** "Nov 13, 5:03 p.m." in Toronto time; "never" for no date. */
const when = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }).format(d) : "never";

const RESULT: Record<string, string> = {
  proposed: "Agent wrote a proposal",
  unchanged: "No change since last check",
  skipped: "Read: no new-patient notice found",
  links_only: "Directory read: its links were sorted in step 2",
  error: "Could not be read",
};

function Flash({ sp }: { sp: { msg?: string; error?: string } }) {
  return <>
    {sp.msg ? <p role="status" className="note ok">{sp.msg}</p> : null}
    {sp.error ? <p role="alert" className="note err">{sp.error}</p> : null}
  </>;
}

/**
 * Discovery, as three steps: ① find pages (web search or the starter list), ② the triage agent sorts them
 * (watch, dismiss, or ask a person) and a person decides only the unsure ones, ③ check watched pages: changed text
 * goes to the intake agent, which writes proposals for the inbox on /admin. Nothing here publishes a listing.
 */
export default async function Discovery({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string; check?: string; at?: string }> }) {
  await requireAdmin("/admin/discovery");
  const sp = await searchParams;
  const now = new Date();
  const [pending, active, counts, checks, searchState, proposalsWaiting, listingsWaiting, dismissed, unsortedTotal, askTotal, dismissedTotal] = await Promise.all([
    // Pages the agent asked about come before unsorted ones, so the 60-row limit never hides a question for you.
    prisma.discoverySource.findMany({ where: { status: "pending" }, orderBy: [{ isSample: "asc" }, { triageDecision: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], take: 60 }),
    prisma.discoverySource.findMany({ where: { status: "active" }, orderBy: { reviewedAt: "desc" }, take: 60 }),
    prisma.discoverySource.groupBy({ by: ["status"], _count: true }),
    prisma.discoveryCheck.findMany({ include: { source: true }, orderBy: { retrievedAt: "desc" }, take: 15 }),
    prisma.discoverySearchState.findUnique({ where: { id: "ontario" } }),
    prisma.agentProposal.count({ where: { status: "pending" } }),
    prisma.listing.count({ where: { status: "pending" } }),
    prisma.discoverySource.findMany({ where: { status: "rejected", triageDecision: "dismiss", reviewedAt: null }, orderBy: { triagedAt: "desc" }, take: 60 }),
    // Real totals: the lists above stop at 60 rows, so counting the lists would cap every number at 60.
    prisma.discoverySource.count({ where: { status: "pending", triageDecision: null } }),
    prisma.discoverySource.count({ where: { status: "pending", triageDecision: "ask_human" } }),
    prisma.discoverySource.count({ where: { status: "rejected", triageDecision: "dismiss", reviewedAt: null } }),
  ]);
  // Unsorted pages are the agent's work, not yours: opening this page starts sorting them in the background.
  const sorting = unsortedTotal > 0 && (triageRunning() || (after(() => sortQueueInBackground()), true));
  const needYou = askTotal;
  const waiting = proposalsWaiting + listingsWaiting;
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const unsorted = pending.filter((s) => !s.triageDecision);
  const askYou = pending.filter((s) => s.triageDecision === "ask_human");
  const agentWatched = active.filter((s) => s.triageDecision?.startsWith("watch") && !s.reviewedAt);
  const lastTriage = searchState?.lastTriage as { planner?: string; at?: string } | null | undefined;
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
      <p className="muted">Search finds clinic pages, the triage agent sorts them, and the intake agent reads watched pages when they change. You only decide the pages the agent is unsure about, and every proposed listing still waits for a person in the <a href="/admin">inbox</a>.</p>
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

    <section className="card step stack" id="review">
      <h2><span className="stepnum">2</span> The agent sorts what was found <span className="muted small">({needYou} need you)</span></h2>
      {sp.at === "review" ? <Flash sp={sp} /> : null}
      <p className="small muted">The <b>triage agent</b> looks at each page&apos;s link, title and search description (it fetches nothing). It watches clear clinic and directory pages, dismisses clearly useless ones, and leaves the rest for you. Watching only means reading that public page once a day. You can undo any choice.</p>
      <div className="tiles">
        <a className="tile" href="#agent-watched"><b>{agentWatched.length}</b>Watched by the agent</a>
        <a className="tile" href="#agent-dismissed"><b>{dismissedTotal}</b>Dismissed by the agent</a>
        <a className={`tile ${needYou ? "hot" : ""}`} href="#ask-you"><b>{needYou}</b>Need you<span className="small muted">The agent was not sure</span></a>
      </div>
      {lastTriage?.at ? <div><p className="small muted">Last sorted: {when(new Date(lastTriage.at))}</p><AgentTrace trace={searchState?.lastTriage} /></div> : null}
      {unsortedTotal ? <p className="note small" role="status"><b>The agent is sorting {unsortedTotal} new page{unsortedTotal === 1 ? "" : "s"}.</b> {sorting ? "It started on its own, so there is nothing to click. Reload this page in a minute to see its choices." : null}</p> : null}
      <div id="ask-you">
        {!askYou.length ? <p className="muted">Nothing needs you{unsortedTotal ? " yet" : ""}.{unsortedTotal ? "" : " Use step 1 to find more pages."}</p> : null}
        <ul className="srclist">{askYou.map((s) => <SourceRow key={s.id} s={s} />)}</ul>
        {askTotal > askYou.length ? <p className="small muted">Showing {askYou.length} of {askTotal}.</p> : null}
      </div>
      {unsorted.length ? <details>
        <summary className="small">Waiting for the agent ({unsortedTotal}) · you can decide one yourself</summary>
        <ul className="srclist">{unsorted.map((s) => <SourceRow key={s.id} s={s} />)}</ul>
        <form action={sortNow}><SubmitButton className="btn ghost" pendingText="Sorting…">Sort now and show me the result</SubmitButton></form>
      </details> : null}
      {agentWatched.length ? <details id="agent-watched">
        <summary className="small">Pages the agent chose to watch ({agentWatched.length})</summary>
        <ul className="srclist">{agentWatched.map((s) => <AgentChoice key={s.id} s={s} />)}</ul>
      </details> : null}
      {dismissed.length ? <details id="agent-dismissed">
        <summary className="small">Pages the agent dismissed ({dismissedTotal > dismissed.length ? `latest ${dismissed.length} of ${dismissedTotal}` : dismissedTotal})</summary>
        <ul className="srclist">{dismissed.map((s) => <AgentChoice key={s.id} s={s} />)}</ul>
      </details> : null}
    </section>

    <section className="card step" id="check">
      <h2><span className="stepnum">3</span> Check watched pages <span className="muted small">({active.length} watched · {due} due now)</span></h2>
      {sp.at === "check" ? <Flash sp={sp} /> : null}
      <p className="small muted">Fetches up to 3 watched pages that are due (sample pages are never fetched). When a page&apos;s text is new or changed, the <b>intake agent</b> reads it, checks the directory, and writes a proposal. An unchanged page creates nothing.</p>
      <div className="row">
        <form action={checkNow}><SubmitButton pendingText="Checking pages… the agent may take a minute" disabled={!due}>Check watched pages now</SubmitButton></form>
        <a className="btn ghost" href="/admin">Open the inbox ({waiting} waiting) →</a>
      </div>
      {active.length ? <table className="data compact">
        <thead><tr><th>Page</th><th>Last checked</th><th>Result</th><th></th></tr></thead>
        <tbody>{active.map((s) => {
          const c = lastCheckBySource.get(s.id);
          return <tr key={s.id}>
            <td><a href={s.url} target="_blank" rel="noreferrer">{nameOf(s)}</a> {s.isSample ? <span className="tag">Sample</span> : null}<div className="small muted">{s.kind === "directory" ? "Directory" : "Clinic page"} · next check {s.nextCheckAt <= now ? "due now" : when(s.nextCheckAt)}</div></td>
            <td className="small">{when(s.lastCheckedAt)}</td>
            <td className="small">{s.lastError ? <span className="err">{s.lastError}</span> : c ? <>{RESULT[c.status] ?? c.status}{c.outcomeId ? <> · <a href={c.outcomeKind === "listing" ? `/admin#individual-${c.outcomeId}` : "/admin#needs"}>open</a></> : null}</> : "Not checked yet"}</td>
            <td><form action={pauseSource}><input type="hidden" name="id" value={s.id} /><button className="btn link small" type="submit">Stop watching</button></form></td>
          </tr>;
        })}</tbody>
      </table> : <p className="muted">No watched pages yet. Find pages in step 1; the agent sorts them in step 2.</p>}
    </section>

    <details className="card" id="evidence">
      <summary><b>What the agent read</b> <span className="muted small">(last {checks.length} page checks)</span></summary>
      {!checks.length ? <p className="muted">No pages have been read yet.</p> : null}
      {checks.map((c) => <article className="stack evidence" key={c.id}>
        <h3>{nameOf({ title: c.title, url: c.sourceUrl, host: c.source.host })} {c.source.isSample ? <span className="tag">Sample</span> : null}</h3>
        <p className="small"><a className="source-url" href={c.sourceUrl} target="_blank" rel="noreferrer">{c.sourceUrl}</a></p>
        <p className="small">Read {when(c.retrievedAt)} · Date on the page: {c.publishedDate ?? "not stated"} · {RESULT[c.status] ?? c.status}{c.outcomeId ? <> · <a href={c.outcomeKind === "listing" ? `/admin#individual-${c.outcomeId}` : "/admin#needs"}>open the proposal</a></> : null}</p>
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
      {s.triageReason ? <div className="small why-line">Agent: {s.triageReason}</div> : null}
    </div>
    {s.kind === "social" ? <p className="small note">Social post: add the clinic&apos;s own page instead.</p> :
    <form className="srcform" action={approveSource}>
      <input type="hidden" name="id" value={s.id} />
      <select name="kind" required defaultValue={guessDirectory ? "directory" : "clinic"} aria-label="Page type">
        <option value="clinic">Clinic page</option>
        <option value="directory">Directory</option>
      </select>
      <label className="checkline small"><input type="checkbox" name="authorize" value="yes" required />I opened it and it is a public clinic page</label>
      {!s.isSample && requireTrustedSource() ? <details className="small"><summary>Batch option</summary>
        <label className="checkline small"><input type="checkbox" name="trustedClinic" value="yes" />This is the clinic&apos;s own website, so its clean new listings may go to batch review. Directories and shared hosts do not qualify.</label>
      </details> : null}
      <button className="btn" type="submit">Approve</button>
    </form>}
    <form action={rejectSource}><input type="hidden" name="id" value={s.id} /><button className="btn ghost small" type="submit">Reject</button></form>
  </li>;
}

const CHOICE: Record<string, string> = { watch_clinic: "Watching as a clinic page", watch_directory: "Watching as a directory", dismiss: "Dismissed" };

/** A page the triage agent decided on by itself: its choice, its reason, and an undo. */
function AgentChoice({ s }: { s: Source }) {
  return <li className="srcrow">
    <div className="srcinfo">
      <b>{nameOf(s)}</b> {s.isSample ? <span className="tag">Sample</span> : null}
      <div className="small"><a className="source-url" href={s.url} target="_blank" rel="noreferrer">{s.host} ↗</a> <span className="muted">· {CHOICE[s.triageDecision ?? ""] ?? s.triageDecision}</span></div>
      {s.triageReason ? <div className="small muted">Agent: {s.triageReason}</div> : null}
    </div>
    <form action={undoTriage}><input type="hidden" name="id" value={s.id} /><button className="btn ghost small" type="submit">Undo</button></form>
  </li>;
}
