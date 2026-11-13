import SubmitButton from "@/components/SubmitButton";
import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addSource, addStarterSources, approveSource, offlineDemo, runNow, pauseSource, rejectSource } from "./actions";
export const dynamic = "force-dynamic";
export default async function Discovery({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; msg?: string; error?: string; check?: string }> }) {
  await requireAdmin("/admin/discovery");
  const sp = await searchParams;
  const status = ["pending","active","paused","rejected"].includes(sp.status ?? "") ? sp.status! : "pending";
  const page = Math.min(1000,Math.max(0,Number.parseInt(sp.page ?? "0",10)||0));
  const [sources, counts, checks, searchState] = await Promise.all([
    prisma.discoverySource.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 30, skip: page*30 }),
    prisma.discoverySource.groupBy({ by: ["status"], _count: true }),
    prisma.discoveryCheck.findMany({ include: { source: true }, orderBy: { retrievedAt: "desc" }, take: 15 }),
    prisma.discoverySearchState.findUnique({ where: { id: "ontario" } }),
  ]);
  if (sp.check && /^[a-z0-9_-]{1,128}$/i.test(sp.check) && !checks.some((c) => c.id === sp.check)) {
    const selected = await prisma.discoveryCheck.findUnique({ where: { id: sp.check }, include: { source: true } });
    if (selected) checks.unshift(selected);
  }
  const total = counts.find((c) => c.status === status)?._count ?? 0;
  return <main className="wrap wide">
    <AdminNav />
    <h1>Discover clinics across Ontario</h1>
    <p>Search for public announcements, review new sources, and monitor approved clinic pages for changes. Agents prepare evidence and proposals; humans authorize publication.</p>
    {sp.msg ? <p role="status" className="note ok">{sp.msg}</p> : null}
    {sp.error ? <p role="alert" className="note err">{sp.error}</p> : null}
    <section className="card">
      <h2>Discovery and monitoring</h2>
      <p className="small">Scheduled collection: <b>{process.env.DISCOVERY_ENABLED === "true" ? "enabled" : "disabled"}</b>. Web search: <b>{process.env.DISCOVERY_SEARCH_PROVIDER === "tavily" ? process.env.TAVILY_API_KEY ? "Tavily configured" : "Tavily needs a server-side API key" : process.env.DISCOVERY_SEARCH_PROVIDER === "mock" ? "mock (offline sample results, no Tavily calls)" : "off"}</b>.</p>
      {searchState ? <p className="small">Last web search: {searchState.lastSearchedAt?.toISOString() ?? "never"} · Next search budget: {searchState.nextSearchAt.toISOString()}{searchState.lastError ? ` · ${searchState.lastError}` : ""}</p> : null}
      <p className="small muted">Search rotates through Ontario regions. New search results and linked pages enter source review before collection. Social posts are leads; follow their clinic links. Private, login-only and JavaScript-only content is not collected. Retrieval time never confirms patient availability.</p>
      <div className="row"><form action={addStarterSources}><SubmitButton className="btn ghost" pendingText="Adding source leads…">Add Ontario starter sources</SubmitButton></form><form action={runNow}><SubmitButton pendingText="Searching and monitoring…">Search and monitor now</SubmitButton></form><form action={offlineDemo}><SubmitButton className="btn ghost" pendingText="Preparing offline demo…">Run offline Ontario demo</SubmitButton></form></div>
      <p className="small muted">The offline demo uses an invented Ottawa announcement with no network or LLM calls. Run it once to add the sample source, approve monitoring below, then run it again to prepare a candidate.</p>
    </section>
    <form className="card" action={addSource}>
      <h2>Add a source lead</h2>
      <p className="small muted">Optional starting pages for monitoring; web search can discover new sources automatically once configured.</p>
      <label className="lbl">Public page URL<input type="text" name="url" placeholder="https://clinic.example/new-patients" required maxLength={2000} /></label>
      <label className="lbl">Source title<input type="text" name="title" maxLength={300} /></label>
      <button className="btn ghost" type="submit">Add to source review</button>
    </form>
    <section className="stack" id="sources">
      <h2>Source review</h2>
      <nav className="row" aria-label="Source status">{["pending","active","paused","rejected"].map((s) => <a key={s} href={`?status=${s}`} aria-current={status===s ? "page" : undefined}>{s} ({counts.find((c) => c.status===s)?._count ?? 0})</a>)}</nav>
      {!sources.length ? <p className="muted">No {status} sources.</p> : null}
      {sources.map((s) => <article className="card" key={s.id} id={`source-${s.id}`}>
        <h3>{s.title || s.host} {s.isSample ? <span className="tag">Sample</span> : null}</h3>
        <a className="source-url" href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
        <p className="small muted">{s.kind} · {s.status} · Found by {s.foundBy}{s.query ? ` · ${s.query}` : ""}</p>
        <p className="small">Last checked: {s.lastCheckedAt?.toISOString() ?? "never"} · Next due: {s.nextCheckAt.toISOString()} · Batch source verification: {s.trustedClinic ? "yes" : "no"}</p>
        {s.lastError ? <p className="note err">{s.lastError}</p> : null}
        {s.status !== "active" && s.kind !== "social" ? <form className="stack" action={approveSource}>
          <input type="hidden" name="id" value={s.id} />
          <label className="lbl">Source kind<select name="kind" required defaultValue={["clinic","directory"].includes(s.kind) ? s.kind : ""}><option value="">Choose source kind</option><option value="clinic">Clinic announcement or registration page</option><option value="directory">Directory — discover links only</option></select></label>
          <label className="checkline"><input type="checkbox" name="authorize" value="yes" required />I reviewed this public page and authorize monitoring.</label>
          <label className="checkline"><input type="checkbox" name="trustedClinic" value="yes" disabled={s.isSample} />I verified this is the clinic's own dedicated website host. Allow its qualifying new listings into batch review. Shared directories and social hosts do not qualify.</label>
          <button className="btn" type="submit">Approve source monitoring</button>
        </form> : s.kind === "social" ? <p className="note">Social post found. Review its linked clinic page and add that public URL for monitoring. Direct social-platform crawling is not supported.</p> : null}
        <form className="row" action={pauseSource}><input type="hidden" name="id" value={s.id} /><button className="btn ghost" type="submit" formAction={pauseSource}>Pause source</button><button className="btn bad" type="submit" formAction={rejectSource}>Reject source</button></form>
      </article>)}
      <div className="row">{page>0 ? <a href={`?status=${status}&page=${page-1}`}>Previous sources</a> : null}{(page+1)*30<total ? <a href={`?status=${status}&page=${page+1}`}>Next sources</a> : null}</div>
    </section>
    <section className="stack" id="evidence">
      <h2>Recent collected evidence</h2>
      {!checks.length ? <p className="muted">No pages have been collected yet.</p> : null}
      {checks.map((c) => <article className="card" id={`evidence-${c.id}`} key={c.id}>
        <h3>{c.title || c.source.host} {c.source.isSample ? <span className="tag">Sample</span> : null}</h3>
        <a className="source-url" href={c.sourceUrl} target="_blank" rel="noreferrer">{c.sourceUrl}</a>
        <p className="small">Retrieved: {c.retrievedAt.toISOString()} · Publication date declared by page: {c.publishedDate ?? "unknown"} · {c.status}</p>
        {c.outcomeId ? <a href={c.outcomeKind === "listing" ? `/admin#individual-${c.outcomeId}` : "/admin#proposals"}>Review the prepared proposal</a> : null}
        {c.error ? <p className="note err">{c.error} Inspect the evidence before retrying intake manually.</p> : null}
        <details><summary>Source excerpt and content hash</summary><pre className="raw">{c.excerpt}</pre><p className="mono">{c.contentHash}</p></details>
      </article>)}
    </section>
  </main>;
}
