import "./env";
import { prisma } from "../lib/db";
import { seedDiscoverySources } from "../lib/discovery/seeds";
seedDiscoverySources(prisma).then((added)=>console.log(`Added ${added} source leads. They require review; no pages were fetched and no availability was verified.`))
  .catch((error)=>{console.error(error instanceof Error ? error.message : "Could not seed source leads.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
