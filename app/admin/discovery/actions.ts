"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDiscoverySource, runDiscoveryJob } from "@/lib/discovery/service";
import { sourceKind } from "@/lib/discovery/search";
import { seedDiscoverySources } from "@/lib/discovery/seeds";
import { runDiscoveryDemo } from "@/lib/discovery/demo";
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
  refresh(); go("msg", `Added ${added} Ontario starter pages to step 2. Nothing has been fetched yet.`, "review");
}

/** Step 1: web search only. New pages go to review; nothing is fetched. */
export async function searchNow() {
  await requireAdmin();
  const result = await runDiscoveryJob(prisma, { manual: true, maxQueries: 3, monitor: false });
  refresh();
  if (result.searchError) return go("error", `Search failed: ${result.searchError}`, "find");
  go("msg", result.found ? `Found ${result.found} new page${result.found === 1 ? "" : "s"} to review in step 2.` : "Search ran (or is waiting for tomorrow's budget). No new pages this time.", "review");
}

/** Step 3: check approved pages only. Changed pages go to the intake agent, which writes proposals for review. */
export async function checkNow() {
  await requireAdmin();
  const r = await runDiscoveryJob(prisma, { manual: true, maxSources: 3, search: false });
  refresh();
  if (!r.checked) return go("msg", "No approved pages are due for a check. Approve a page in step 2, or wait until a checked page is due again.", "check");
  const parts = [`Checked ${r.checked} page${r.checked === 1 ? "" : "s"}`, `${r.proposed} new proposal${r.proposed === 1 ? "" : "s"} for review`];
  if (r.unchanged) parts.push(`${r.unchanged} unchanged`);
  if (r.errors) parts.push(`${r.errors} could not be read`);
  const other = r.checked - r.proposed - r.unchanged - r.errors;
  if (other) parts.push(`${other} had no new-patient notice (or were directories whose links went to step 2)`);
  go("msg", `${parts.join(" · ")}.`, "check");
}

