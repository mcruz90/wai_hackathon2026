/** Shows every tool call an agent made, so a reviewer can see how it reached its proposal. */
type Step = { tool: string; input: unknown; result: unknown; error?: string; plan?: string };
type Trace = { planner?: string; model?: string | null; note?: string; steps?: Step[] };

const LABELS: Record<string, string> = {
  read_announcement: "Read the announcement",
  find_matching_listings: "Checked for existing listings",
  submit_new_listing: "Proposed a new listing",
  propose_update: "Proposed an update",
  no_listing: "Recommended not listing",
  find_listings_needing_attention: "Looked for stale listings",
  propose_recheck: "Proposed a re-check",
  finish: "Finished",
};

function brief(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 220 ? `${s.slice(0, 220)}…` : s;
}

export default function AgentTrace({ trace, open = false }: { trace: unknown; open?: boolean }) {
  const t = (trace && typeof trace === "object" ? trace : {}) as Trace;
  const steps = Array.isArray(t.steps) ? t.steps : [];
  if (!steps.length) return null;
  const who = t.planner === "claude" ? `Claude (${t.model ?? "model"}) chose each step`
    : t.planner === "cohere" ? `Cohere (${t.model ?? "model"}) chose each step`
    : "Scripted planner: same tools, fixed order";
  return (
    <details className="trace" open={open}>
      <summary className="small muted">Agent steps ({steps.length}) · {who}</summary>
      <ol className="small">
        {steps.map((s, i) => (
          <li key={i}>
            {s.plan ? <div className="muted"><i>Plan: {brief(s.plan)}</i></div> : null}
            <b>{LABELS[s.tool] ?? s.tool}</b>
            {s.input && Object.keys(s.input as object).length ? <div className="muted mono">in: {brief(s.input)}</div> : null}
            {s.error ? <div className="err">error: {s.error}</div> : <div className="muted mono">out: {brief(s.result)}</div>}
          </li>
        ))}
      </ol>
      {t.note ? <p className="small muted">{t.note}</p> : null}
    </details>
  );
}
