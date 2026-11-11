import WaitlistShell from "@/components/WaitlistShell";
import { config } from "@/lib/config";
import { fill, T } from "@/lib/i18n";
import { parseSearch, searchQuery } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function Rule({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  const w = T[s.lang];
  const vars = { km: config.waitlistRadiusKm, batch: config.offerBatchSize, hours: config.offerWindowHours };
  return (
    <WaitlistShell lang={s.lang} back={`/waitlist/status?${searchQuery(s)}`}>
      <section className="card">
        <h1>{w.wlRuleH}</h1>
        <ol className="plain">{w.wlRules.map((r) => <li key={r}>{fill(r, vars)}</li>)}</ol>
      </section>
    </WaitlistShell>
  );
}
