import "./env";
import { prisma } from "../lib/db";
import { runDiscoveryJob } from "../lib/discovery/service";
runDiscoveryJob(prisma).then((result) => console.log(JSON.stringify(result))).catch((error) => {
  console.error(error instanceof Error ? error.message : "Discovery failed."); process.exitCode=1;
}).finally(() => prisma.$disconnect());
