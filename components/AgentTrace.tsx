/**
 * Shows how an agent reached its proposal, one plain sentence per step, so a reviewer can follow it without reading JSON.
 * The model's own plan for each step (when the provider gives one) is shown above the step, and the raw tool inputs and
 * outputs stay available under "Technical details".
 */
type Step = { tool: string; input: unknown; result: unknown; error?: string; plan?: string };
type Trace = { planner?: string; model?: string | null; note?: string; steps?: Step[] };
type Obj = Record<string, unknown>;

const LABELS: Record<string, string> = {
  read_announcement: "Read the notice",
  find_contact_details: "Looked for addresses and phone numbers on the page",
  fill_missing_fields: "Filled empty fields from the page's contact details",
  find_matching_listings: "Checked the directory for the same clinic",
  submit_new_listing: "Sent it for review as a new listing",
  propose_update: "Proposed a change to an existing listing",
  no_listing: "Recommended not listing it",
  find_listings_needing_attention: "Looked for listings that may be out of date",
  propose_recheck: "Asked a reviewer to call the clinic",
  list_new_pages: "Looked at the new pages from web search",
  sort_pages: "Sorted pages",
  finish: "Finished",
};

const asObj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const PROVIDER: Record<string, string> = { family_doctor: "family doctor", nurse_practitioner: "nurse practitioner", unknown: "provider type unclear" };
const ACCEPTING: Record<string, string> = { yes: "says it is taking new patients", no: "says it is not taking new patients", unclear: "does not clearly say it is taking new patients" };

/** One plain sentence for a step. Falls back to the label when the step's data is not in the expected shape. */
export function describeStep(s: Step): string {
  const input = asObj(s.input), result = asObj(s.result);
  if (s.error) return `${LABELS[s.tool] ?? s.tool}: this step failed (${s.error}).`;
  // Long results are stored cut short, as text; then only the label is shown and the details hold the rest.
  if (typeof s.result === "string" && s.result.endsWith("…")) return `${LABELS[s.tool] ?? s.tool}.`;
  switch (s.tool) {
    case "read_announcement": {
      const conf = asObj(result.confidence);
      const unsure = ["location", "provider_type", "languages", "date"].filter((k) => conf[k] && conf[k] !== "high");
      const langs = list(result.languages);
      const parts = [
        str(result.clinic) || "no clinic name",
        [str(result.area), str(result.fsa)].filter(Boolean).join(" ") || "no area",
        PROVIDER[str(result.provider_type)] ?? "provider type unclear",
        langs.length ? `languages: ${langs.join(", ")}` : "no languages stated",
        str(result.date) ? `dated ${str(result.date)}` : "no date",
      ];
      const accepting = ACCEPTING[str(result.accepting)] ?? "";
      return `Read the notice: ${parts.join(" · ")}. It ${accepting || "is unclear about new patients"}. ${unsure.length ? `Less sure about: ${unsure.join(", ").replace("_", " ")}.` : "Every field read with high confidence."}`;
    }
    case "find_contact_details": {
      const n = (k: string) => (Array.isArray(result[k]) ? (result[k] as unknown[]).length : 0);
      return `Looked for contact details on the page: ${n("postal_areas")} postal code${n("postal_areas") === 1 ? "" : "s"}, ${n("phones")} phone number${n("phones") === 1 ? "" : "s"}, ${n("places")} place name${n("places") === 1 ? "" : "s"}.`;
    }
    case "fill_missing_fields": {
      const filled = list(result.filled), refused = list(result.refused);
      return (filled.length ? `Filled ${filled.join(", ")} from the page's contact details.` : "Filled nothing: the page did not settle the empty fields.")
        + (refused.length ? ` Refused: ${refused.join("; ")}.` : "");
    }
    case "find_matching_listings": {
      const matches = Array.isArray(result.matches) ? result.matches.map(asObj) : [];
      const what = [str(input.clinic), str(input.phone)].filter(Boolean).join(", ") || "this clinic";
      return matches.length
        ? `Checked the directory for ${what}: found ${matches.length} possible match${matches.length === 1 ? "" : "es"} (${matches.map((m) => `${str(m.clinic)}, ${str(m.status)}, matched by ${str(m.matched_by)}`).join("; ")}).`
        : `Checked the directory for ${what}: no existing listing.`;
    }
    case "submit_new_listing": return `Sent it for review as a new listing.${str(input.rationale) ? ` Why: ${str(input.rationale)}` : ""}`;
    case "propose_update": return `Proposed to ${input.action === "mark_full" ? "mark an existing listing full" : "re-confirm an existing listing"}.${str(input.rationale) ? ` Why: ${str(input.rationale)}` : ""}`;
    case "no_listing": return `Recommended not listing it.${str(input.reason) ? ` Why: ${str(input.reason)}` : ""}`;
    case "find_listings_needing_attention": {
      const n = Array.isArray(result.listings) ? result.listings.length : 0;
      return `Looked for listings that may be out of date: found ${n}.`;
    }
    case "propose_recheck": return `Asked a reviewer to call the clinic (${input.priority === "high" ? "high priority" : "normal priority"}).${str(input.rationale) ? ` Why: ${str(input.rationale)}` : ""}`;
    case "list_new_pages": {
      const n = Array.isArray(result.pages) ? result.pages.length : 0;
      const more = typeof result.remaining === "number" && result.remaining ? `, ${result.remaining} more waiting` : "";
      return `Looked at ${n} new page${n === 1 ? "" : "s"}${more} (titles and descriptions only; nothing was fetched).`;
    }
    case "sort_pages": {
      const ds = Array.isArray(input.decisions) ? input.decisions.map(asObj) : [];
      const count = (d: string) => ds.filter((x) => x.decision === d).length;
      const parts = [["watch_clinic", "watched as clinic pages"], ["watch_directory", "watched as directories"], ["dismiss", "dismissed"], ["ask_human", "sent to you"]]
        .map(([k, label]) => (count(k) ? `${count(k)} ${label}` : "")).filter(Boolean);
      return `Sorted ${ds.length} page${ds.length === 1 ? "" : "s"}${parts.length ? `: ${parts.join(", ")}` : ""}. Each page shows its reason below.`;
    }
    case "finish": return `Finished.${str(input.summary) ? ` ${str(input.summary)}` : ""}`;
    default: return LABELS[s.tool] ?? s.tool;
  }
}

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
      <summary className="small muted">How the agent got here ({steps.length} steps) · {who}</summary>
      <ol className="small">
        {steps.map((s, i) => (
          <li key={i}>
            {s.plan ? <div className="muted"><i>Agent&apos;s plan: {brief(s.plan)}</i></div> : null}
            <span className={s.error ? "err" : undefined}>{describeStep(s)}</span>
          </li>
        ))}
      </ol>
      {t.note ? <p className="small muted">{t.note}</p> : null}
      <details>
        <summary className="small muted">Technical details</summary>
        <ol className="small">
          {steps.map((s, i) => (
            <li key={i}>
              <b className="mono">{s.tool}</b>
              {s.input && Object.keys(s.input as object).length ? <div className="muted mono">in: {brief(s.input)}</div> : null}
              {s.error ? <div className="err">error: {s.error}</div> : <div className="muted mono">out: {brief(s.result)}</div>}
            </li>
          ))}
        </ol>
      </details>
    </details>
  );
}
