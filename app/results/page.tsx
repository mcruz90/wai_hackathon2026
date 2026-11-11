import { config } from "@/lib/config";
import { redirect } from "next/navigation";
import { HtmlLang, ListingCard, SampleBanner, Steps } from "@/components/bits";
import Track from "@/components/Track";
import { fill, T } from "@/lib/i18n";
import { parseSearch, rankedListings, searchQuery } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  if (!s.fsa) redirect(`/?lang=${s.lang}`);
  const w = T[s.lang], q = searchQuery(s);
  const { listings, known } = await rankedListings(s, w.match);
  return (
    <div className="wrap">
      <HtmlLang lang={s.lang} />
      <Track fsa={s.fsa} lang={s.lang} type={s.type} />
      <main className="stack">
        <Steps n={2} />
        <a className="btn link" href={`/?${q}`}>← {w.back}</a>
        {listings.some((l) => l.isSample) ? <SampleBanner lang={s.lang} /> : null}
        <div>
          <h1 style={{ fontSize: "1.3rem" }}>{fill(w.results, { fsa: s.fsa })}</h1>
          <p className="muted small">{fill(w.count, { n: listings.length })}</p>
          {known ? <p className="muted small">{fill(w.radius, { n: config.searchRadiusKm })}</p> : null}
        </div>
        {known ? null : <p className="note">{w.unk}</p>}
        {listings.length ? listings.map((l) => <ListingCard key={l.id} l={l} lang={s.lang} href={`/listing/${l.id}?${q}`} />) : <p className="note">{w.none}</p>}
        <a className="btn ghost" href={`/plan?${q}`}>{w.toPlan}</a>
        <p className="small muted">{w.disc}</p>
      </main>
    </div>
  );
}
