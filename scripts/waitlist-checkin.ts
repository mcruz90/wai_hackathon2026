/** Scheduled job for the waitlist concept: reminders, expired reply windows, 30-day check-ins. Sample rows only. */
import "./env";
import { prisma } from "../lib/db";
import { runWaitlistJob } from "../lib/waitlist";

runWaitlistJob()
  .then((r) => console.log(`Waitlist (sample): ${r.reminders} reminders, ${r.expired} reply windows closed, ${r.checkins} check-ins.`))
  .finally(() => prisma.$disconnect());
