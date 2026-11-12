import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { DAY_MS, NEARBY_KM, SMALL_CELL } from "@/lib/config";
import { prisma } from "@/lib/db";
import { FSA_TABLE, km } from "@/lib/fsa";
import { EN_NAME, type Lang } from "@/lib/i18n";
import { liveWhere, reportedLanguages } from "@/lib/listings";

export const dynamic = "force-dynamic";

/** Any count under 5 is hidden, including zero-adjacent small cells, so no row can point at a few people. */
const cell = (n: number) => (n === 0 ? "0" : n < SMALL_CELL ? `<${SMALL_CELL}` : String(n));

export default async function Partner() {
  await requireAdmin("/partner");
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [grouped, sampleRows, live] = await Promise.all([
    prisma.dailyCount.groupBy({ by: ["fsa", "language"], where: { date: { gte: since } }, _sum: { searches: true, searchesNoLangMatch: true, listingOpens: true, fullReports: true } }),
    prisma.dailyCount.count({ where: { isSample: true, date: { gte: since } } }),
    prisma.listing.findMany({ where: liveWhere(), select: { id: true, lat: true, lng: true, languages: true } }),
  ]);
  // A listing "offers" a language if the language is listed or at least 2 patients reported being served in it.
  // A listing with no listed or reported language is "unknown": part of an apparent gap may be missing information.
  const reports = await reportedLanguages(live.map((l) => l.id));
  const known = live.map((l) => ({ ...l, offers: [...new Set([...l.languages, ...(reports.get(l.id)?.spoke ?? [])])] }));
  const rows = grouped.map((g) => {
    const at = FSA_TABLE[g.fsa];
    const name = EN_NAME[g.language as Lang] ?? g.language;
    return {
      fsa: g.fsa, language: name, searches: g._sum.searches ?? 0, noMatch: g._sum.searchesNoLangMatch ?? 0, opens: g._sum.listingOpens ?? 0, full: g._sum.fullReports ?? 0,
      liveNearby: at ? known.filter((l) => l.offers.includes(name) && km(at, [l.lat, l.lng]) <= NEARBY_KM).length : 0,
      unknownNearby: at ? known.filter((l) => !l.offers.length && km(at, [l.lat, l.lng]) <= NEARBY_KM).length : 0,
    };
  }).sort((a, b) => a.fsa.localeCompare(b.fsa) || b.searches - a.searches);
  // Unmet demand: plenty of searches, and at most one live listing nearby in that language.
  const unmet = rows.filter((r) => r.searches >= 20 && r.liveNearby <= 1).sort((a, b) => b.noMatch - a.noMatch || b.searches - a.searches).slice(0, 8);
  return (
    <div className="wrap wide">
      <AdminNav />
      <div><h1>Partner view</h1><p className="muted">Last 30 days, by postal area and language. Counters only: no names, no addresses, nothing about any one person.</p></div>
      {sampleRows ? <div className="banner">Sample counts. These numbers were generated for the demo and include no real searches.</div> : null}

      <section className="card">
        <h2>Unmet demand</h2>
        <p className="small muted">Areas and languages with at least 20 searches and no more than one live listing in that language within {NEARBY_KM} km. A listing offers a language if the clinic lists it or at least 2 patients reported being served in it.</p>
        {unmet.length ? (
          <ol className="plain">
            {unmet.map((r) => (
              <li key={r.fsa + r.language}><b>{r.language} near {r.fsa}</b>: {cell(r.searches)} searches, {cell(r.noMatch)} found no listing in {r.language}.{" "}
                <span className="muted">{r.liveNearby === 0 ? "No live listing nearby is known to offer it." : "1 live listing nearby offers it."}{" "}
                  {r.unknownNearby ? `${r.unknownNearby} nearby listing${r.unknownNearby === 1 ? " does" : "s do"} not list languages yet, so part of this gap may be missing information.` : "Every nearby listing lists its languages, so this is a known gap."}</span></li>
            ))}
          </ol>
        ) : <p className="muted">Nothing stands out yet.</p>}
      </section>

      <section className="card">
        <h2>By postal area and language</h2>
        <p className="small muted">Counts under {SMALL_CELL} are shown as &lt;{SMALL_CELL}.</p>
        <div className="scroll"><table className="data">
          <thead><tr><th>Area</th><th>Language</th><th className="num">Searches</th><th className="num">No listing in that language</th><th className="num">Listing opens</th><th className="num">Reported full</th><th className="num">Live listings nearby in that language</th><th className="num">Nearby, languages not listed</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.fsa + r.language}><td>{r.fsa}</td><td>{r.language}</td><td className="num">{cell(r.searches)}</td><td className="num">{cell(r.noMatch)}</td><td className="num">{cell(r.opens)}</td><td className="num">{cell(r.full)}</td><td className="num">{r.liveNearby}</td><td className="num">{r.unknownNearby}</td></tr>
            ))}
          </tbody>
        </table></div>
        {rows.length ? null : <p className="muted">No counts yet.</p>}
      </section>
    </div>
  );
}
