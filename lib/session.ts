"use client";
/**
 * The patient's plan lives here and nowhere else: sessionStorage in their own
 * browser, cleared when the tab closes. It is never sent to the server.
 */
export type Opened = { id: string; clinic: string; area: string; phone: string | null; report: "open" | "full" | null };
type Plan = { opened: Opened[]; tracked: string[] };
const KEY = "odf_plan";

export function readPlan(): Plan {
  try {
    const p = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return { opened: Array.isArray(p?.opened) ? p.opened : [], tracked: Array.isArray(p?.tracked) ? p.tracked : [] };
  } catch { return { opened: [], tracked: [] }; }
}
function write(p: Plan) { try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch {} }

export function rememberOpened(l: Omit<Opened, "report">) {
  const p = readPlan();
  if (!p.opened.some((o) => o.id === l.id)) { p.opened.push({ ...l, report: null }); write(p); }
}
export function rememberReport(id: string, report: "open" | "full") {
  const p = readPlan();
  const o = p.opened.find((x) => x.id === id);
  if (o) { o.report = report; write(p); }
}
/** True the first time a key is seen in this browser session. Used so one search or open is counted once. */
export function firstTime(key: string): boolean {
  const p = readPlan();
  if (p.tracked.includes(key)) return false;
  p.tracked.push(key); write(p);
  return true;
}
