/** Nightly job: the freshness agent proposes re-checks for listings that may be stale. It changes no listing. */
import "./env";
import { prisma } from "../lib/db";
import { runFreshnessAgent } from "../lib/agent/freshness";

runFreshnessAgent()
  .then((r) => console.log(`${r.summary} (${r.result.planner} planner, ${r.result.steps.length} steps)`))
  .catch((err) => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
