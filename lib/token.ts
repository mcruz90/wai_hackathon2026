import { createHash, createHmac } from "node:crypto";

const secret = () => process.env.TOKEN_SECRET || process.env.ADMIN_PASSWORD || "dev-only-secret";

/**
 * An anonymous token that is the same for one network address for one day and
 * cannot be turned back into the address. The address is read from the request,
 * hashed here, and never stored or logged.
 */
export function dailyToken(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local";
  const addr = fwd.split(",")[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  return createHmac("sha256", secret()).update(`${day}|${addr}`).digest("hex");
}

/** Small in-memory rate limiter keyed by the daily token. Fine for one web instance. */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { hits.set(key, list); return false; }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}

export function adminCookieValue(): string {
  return createHash("sha256").update(`admin|${process.env.ADMIN_PASSWORD || ""}|${secret()}`).digest("hex");
}
