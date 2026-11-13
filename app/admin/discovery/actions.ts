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
const go = (key: "msg"|"error", text: string): never => redirect(`/admin/discovery?${key}=${encodeURIComponent(text.slice(0,600))}`);
function refresh() { revalidatePath("/admin/discovery"); revalidatePath("/admin"); }

export async function addSource(form: FormData) {
  await requireAdmin();
  try { await addDiscoverySource(prisma, { url: value(form,"url"), title: value(form,"title") }); }
  catch { return go("error", "Use a valid public HTTPS page. No credentials, IP addresses, local hosts, or custom ports."); }
  refresh(); go("msg", "Source added to review. Nothing has been fetched or published.");
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
  refresh(); go("msg", "Source approved for monitoring. Listing publication still requires human approval.");
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
  refresh(); go("msg", `Added ${added} Ontario starter source leads for review. No availability was verified and no pages were fetched.`);
}
