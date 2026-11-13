"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDiscoverySource, runDiscoveryJob } from "@/lib/discovery/service";
import { sourceKind } from "@/lib/discovery/search";
import { seedDiscoverySources } from "@/lib/discovery/seeds";
import { runDiscoveryDemo } from "@/lib/discovery/demo";
import { after } from "next/server";
import { runTriageAgent, sortQueueInBackground, unsortedCount, type TriageOutcome } from "@/lib/agent/triage";

type Sorted = (TriageOutcome & { left: number }) | null;
/**
 * Runs the triage agent once (up to MAX_PAGES pages) so the message can say what it did, then sorts the rest of the
 * queue in the background after the response. A failure leaves the pages unsorted; it never blocks the step that found them.
 */
async function triage(): Promise<Sorted> {
  try {
    const t = await runTriageAgent();
    const left = await unsortedCount();
    if (left && t.pages) after(() => sortQueueInBackground());
    return { ...t, left };
  } catch (error) { console.error("Triage failed:", error instanceof Error ? error.message : error); return null; }
}
const sortedText = (t: Sorted) => !t ? "The triage agent could not run. The new pages stay unsorted; try again later."
  : !t.pages ? "" : `The triage agent sorted ${t.pages} page${t.pages === 1 ? "" : "s"}: ${t.sorted.watch_clinic + t.sorted.watch_directory} now watched, ${t.sorted.dismiss} dismissed, ${t.sorted.ask_human} for you to decide.`
    + (t.left ? ` It keeps sorting the other ${t.left} in the background. Reload this page in a minute to see them.` : "");
const value = (f: FormData,k: string) => String(f.get(k) ?? "").trim();
/** Back to the discovery page with a message. `step` (find, review, check) shows the message inside that step and scrolls to it. */
const go = (key: "msg"|"error", text: string, step = ""): never => redirect(`/admin/discovery?${key}=${encodeURIComponent(text.slice(0,600))}${step ? `&at=${step}#${step}` : ""}`);
function refresh() { revalidatePath("/admin/discovery"); revalidatePath("/admin"); }

export async function addSource(form: FormData) {
  await requireAdmin();
  try { await addDiscoverySource(prisma, { url: value(form,"url"), title: value(form,"title") }); }
  catch { return go("error", "Use a valid public HTTPS page. No credentials, IP addresses, local hosts, or custom ports."); }
  refresh(); go("msg", "Page added to step 2 for approval. Nothing has been fetched or published.", "review");
}
export async function approveSource(form: FormData) {
  await requireAdmin();
  if (value(form,"authorize") !== "yes") return go("error", "Review the page and authorize monitoring first.");
  const kind = value(form,"kind");
  if (!["clinic","directory"].includes(kind)) return go("error", "Choose clinic or directory.");
  const source = await prisma.discoverySource.findUnique({ where: { id: value(form,"id") } });
  if (!source || source.status === "active") return go("error", "Source changed. Reload the source review.");
  if (sourceKind(source.url) === "social") return go("error", "Social posts are search leads. Add the clinic's linked public announcement or registration page for monitoring.");
  const updated = await prisma.discoverySource.updateMany({ where: { id: source.id, status: source.status }, data: { status: "active", kind,
    trustedClinic: kind === "clinic" && !source.isSample && value(form,"trustedClinic") === "yes", reviewedAt: new Date(), nextCheckAt: new Date() } });
  if (!updated.count) return go("error", "Source changed. Reload and review it again.");
  refresh(); go("msg", "Approved. It now appears in step 3; check it there. Nothing is published without review.", "check");
}
async function stopSource(form: FormData, status: "paused" | "rejected") {
  await requireAdmin();
  await prisma.discoverySource.updateMany({ where: { id: value(form,"id") }, data: { status, trustedClinic: false, reviewedAt: new Date() } });
  refresh(); go("msg", `Source ${status}. No future collections are scheduled while it has this status.`);
}
// One server action per button, so the decision never depends on which button the browser reports.
export async function pauseSource(form: FormData) { return stopSource(form, "paused"); }
export async function rejectSource(form: FormData) { return stopSource(form, "rejected"); }
export async function runNow() {
  await requireAdmin();
  const result = await runDiscoveryJob(prisma, { manual: true, maxSources: 3, maxQueries: 3 });
  refresh(); go(result.searchError ? "error" : "msg", `${result.found} new source leads; ${result.checked} sources checked; ${result.proposed} proposals; ${result.unchanged} unchanged; ${result.errors} source errors.${result.searchError ? " Search: "+result.searchError : ""}`);
}
export async function offlineDemo() {
  await requireAdmin();
  let message;
  try { message = await runDiscoveryDemo(prisma); }
  catch (error) { return go("error", error instanceof Error ? error.message : "Offline demo failed."); }
  refresh(); go("msg", message);
}

export async function addStarterSources() {
  await requireAdmin();
  const added = await seedDiscoverySources(prisma);
  const t = await triage();
  refresh(); go("msg", `Added ${added} Ontario starter pages. ${sortedText(t)}`.trim(), "review");
}

/** Step 1: web search only. New pages go to review; nothing is fetched. */
export async function searchNow() {
  await requireAdmin();
  const result = await runDiscoveryJob(prisma, { manual: true, maxQueries: 3, monitor: false });
  refresh();
  if (result.searchError) return go("error", `Search failed: ${result.searchError}`, "find");
  const t = await triage();
  refresh();
  go("msg", result.found ? `Found ${result.found} new page${result.found === 1 ? "" : "s"}. ${sortedText(t)}` : "Search ran (or is waiting for tomorrow's budget). No new pages this time.", "review");
}

/** Step 3: check approved pages only. Changed pages go to the intake agent, which writes proposals for review. */
export async function checkNow() {
  await requireAdmin();
  const r = await runDiscoveryJob(prisma, { manual: true, maxSources: 3, search: false });
  // Directories add their links as new pages: sort those too.
  const t = await triage();
  refresh();
  if (!r.checked) return go("msg", "No approved pages are due for a check. Approve a page in step 2, or wait until a checked page is due again.", "check");
  const parts = [`Checked ${r.checked} page${r.checked === 1 ? "" : "s"}`, `${r.proposed} new proposal${r.proposed === 1 ? "" : "s"} for review`];
  if (r.unchanged) parts.push(`${r.unchanged} unchanged`);
  if (r.errors) parts.push(`${r.errors} could not be read`);
  const other = r.checked - r.proposed - r.unchanged - r.errors;
  if (other) parts.push(`${other} had no new-patient notice (or were directories, whose links were sorted)`);
  go("msg", `${parts.join(" · ")}.${t?.pages ? ` ${sortedText(t)}` : ""}`, "check");
}


/** Step 2: sort any pages nobody has sorted yet (for example pages added before the triage agent existed). */
export async function sortNow() {
  await requireAdmin();
  const t = await triage();
  refresh(); go(t ? "msg" : "error", sortedText(t) || "No new pages to sort.", "review");
}

/** Undo the triage agent's choice for one page: it goes back to step 2 for a person to decide. */
export async function undoTriage(form: FormData) {
  await requireAdmin();
  const done = await prisma.discoverySource.updateMany({ where: { id: value(form,"id"), triageDecision: { in: ["watch_clinic","watch_directory","dismiss"] }, reviewedAt: null },
    data: { status: "pending", triageDecision: "ask_human", triageReason: "You undid the agent's choice.", leaseUntil: null } });
  refresh(); go(done.count ? "msg" : "error", done.count ? "Undone. The page is back in step 2 for you to decide." : "That page changed. Reload the page.", "review");
}
