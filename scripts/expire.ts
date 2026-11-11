/** Nightly job: hide listings that were not re-confirmed within EXPIRY_DAYS. */
import "./env";
import { prisma } from "../lib/db";
import { expireListings } from "../lib/expiry";

expireListings()
  .then((names) => console.log(names.length ? `Expired ${names.length}: ${names.join("; ")}` : "Nothing to expire."))
  .finally(() => prisma.$disconnect());
