"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";

type Row = { id: string; version: string; clinic: string; area: string; fsa: string; providerType: string; languages: string[]; phone: string; sourceUrl: string; rawText: string; date: string; isSample: boolean };
function Publish({ count, authorized }: { count: number; authorized: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={!count || !authorized || pending}>{pending ? "Publishing…" : `Publish selected listings (${count})`}</button>;
}
export default function BatchReview({ rows, action }: { rows: Row[]; action: (form: FormData) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [authorized, setAuthorized] = useState(false);
  return <form action={action} className="stack">
    <p className="muted small">These new listings pass the batch checks: a configured clinic website, complete fields supported by the pasted text, a recent date, and no duplicate or conflict flags. Review the sources and evidence; remove any row that needs investigation. Pasted text has not been fetched or independently verified.</p>
    <div className="row">
      <button className="btn ghost" type="button" onClick={() => { setSelected(rows.map((r) => r.id)); setAuthorized(false); }}>Select all {rows.length}</button>
      <button className="btn ghost" type="button" onClick={() => { setSelected([]); setAuthorized(false); }}>Clear selection</button>
      <span role="status">{selected.length} selected</span>
    </div>
    {rows.map((row) => <article className="card" key={row.id}>
      <label className="checkline"><input type="checkbox" name="selection" value={`${row.id}:${row.version}`} checked={selected.includes(row.id)} onChange={(event) => {
        setSelected(event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id)); setAuthorized(false);
      }} /><b>{row.clinic}</b>{row.isSample ? <span className="tag">Sample</span> : null}</label>
      <p className="small">{row.area} · {row.fsa} · {row.providerType === "family_doctor" ? "Family doctor" : "Nurse practitioner"} · {row.languages.join(", ")} · {row.phone}</p>
      <p className="small">Evidence date: <b>{row.date}</b> · <a href={row.sourceUrl} target="_blank" rel="noreferrer">Open clinic source</a> · <a href={`#individual-${row.id}`}>Review individually</a></p>
      <details><summary>View supporting announcement</summary><pre className="raw">{row.rawText}</pre></details>
    </article>)}
    <div className="card">
      <label className="checkline"><input type="checkbox" name="authorize" value="yes" required checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />I have reviewed the selected listings and supporting sources, and authorize this batch to be published.</label>
      <p className="small muted">Spot checks help assess quality; they do not verify every listing. Publication keeps each original evidence date. If a selected row changes or fails a check, the entire batch stays unpublished.</p>
      <Publish count={selected.length} authorized={authorized} />
    </div>
  </form>;
}
