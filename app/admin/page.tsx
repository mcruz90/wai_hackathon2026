import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { FSA_CODES } from "@/lib/fsa";
import { ageDays } from "@/lib/ranking";
import { approve, intake, reject, runExpiry } from "./actions";

export const dynamic = "force-dynamic";

const SOURCES: [string, string][] = [["web", "Clinic website"], ["post", "Community post"], ["list", "Regional list"], ["news", "Clinic newsletter"], ["rev", "Other announcement"]];
const SAMPLE_ANN = "Exciting news! Dr. N. Rahimi is joining Fernleaf Family Practice near Eglinton and Warden next month and will be accepting new patients of all ages. Dr. Rahimi sees patients in English, Farsi and Dari. Call the front desk at 416-555-0145 to get on the list. Please share with anyone who still needs a family doctor!";
type Conf = Record<string, unknown>;
const pill = (v: unknown) => { const c = v === "high" || v === "medium" ? v : "low"; return <span className={`conf ${c}`}>{c}</span>; };
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function Admin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const pending = await prisma.listing.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } });
  const rest = await prisma.listing.findMany({ where: { status: { not: "pending" } }, orderBy: { lastConfirmedAt: "desc" }, include: { _count: { select: { fullReports: true } } } });
  const now = new Date(), today = day(now);
  const provider = process.env.LLM_PROVIDER || "anthropic";
  return (
    <div className="wrap wide">
      <AdminNav />
      {sp.msg ? <p className="note ok" role="status">{sp.msg}</p> : null}
      {sp.error ? <p className="note err" role="alert">{sp.error}</p> : null}

      <form className="card" action={intake}>
        <h1>Intake</h1>
        <p className="muted small">Paste one public announcement and its link. One AI call reads it into fields. Nothing is published until a reviewer approves it below. The demo text is invented.</p>
        {provider === "mock" ? <p className="banner">LLM_PROVIDER is "mock": an offline keyword reader is standing in for the AI. Set a real provider and key for real reads.</p> : null}
        <div><label className="lbl" htmlFor="text">Announcement text</label><textarea id="text" name="text" rows={6} required maxLength={6000} defaultValue={SAMPLE_ANN} /></div>
        <div className="grid2">
          <div><label className="lbl" htmlFor="sourceUrl">Source link</label><input type="text" id="sourceUrl" name="sourceUrl" inputMode="url" placeholder="https://" /></div>
          <div><label className="lbl" htmlFor="sourceType">Source type</label><select id="sourceType" name="sourceType" defaultValue="post">{SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <button className="btn" type="submit">Read announcement</button>
      </form>

      <section className="stack" id="review">
        <h2>Review queue ({pending.length})</h2>
        {pending.length ? null : <p className="muted">Nothing is waiting for review.</p>}
        {pending.map((l) => {
          const c = (l.confidence ?? {}) as Conf;
          const unclearProvider = c.provider_type_read === "unknown";
          const reasons = [
            !c.date_read && "no date found", c.location === "low" && "location is low confidence", (c.provider_type === "low" || unclearProvider) && "provider type is low confidence",
            c.languages === "low" && "languages are low confidence", c.date_read && c.date === "low" && "date is low confidence",
          ].filter(Boolean) as string[];
          const notAccepting = c.accepting !== "yes";
          return (
            <form className="card" key={l.id} action={approve}>
              <input type="hidden" name="id" value={l.id} />
              <div className="review">
                <b>{notAccepting ? "Do not publish unless you have checked" : reasons.length ? "Held for human review" : "Read with confidence. Still needs your approval"}</b>
                <span className="small">
                  {notAccepting ? `The announcement does not clearly say the clinic is taking new patients (the AI read: ${String(c.accepting ?? "unclear")}). ` : ""}
                  {reasons.length ? `Why: ${reasons.join("; ")}.` : notAccepting ? "" : "Check each field against the text, then approve."}
                </span>
                {c.notes ? <span className="small muted">AI note: {String(c.notes)}</span> : null}
              </div>
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
          );
        })}
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
