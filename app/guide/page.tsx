import { HtmlLang } from "@/components/bits";
import { backArrow, guide, T } from "@/lib/i18n";
import { parseSearch, searchQuery } from "@/lib/listings";

/**
 * Questions for an appointment, in the patient's language. A fixed, curated list written in advance:
 * no chat and no live translation. Practical questions only, not medical advice.
 */
export default async function GuidePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  const w = T[s.lang], q = searchQuery(s);
  return (
    <div className="wrap">
      <HtmlLang lang={s.lang} />
      <main className="stack">
        <a className="btn link" href={`/plan?${q}`}>{backArrow(s.lang)} {w.toPlan}</a>
        <div><h1>{w.guideH}</h1><p className="muted">{w.guideSub}</p></div>
        {guide(s.lang).map((g) => (
          <section className="card guide-group" key={g.title}>
            <h2>{g.title}</h2>
            <div className="script">
              {g.items.map((it) => (
                <div className="say" key={it.en}><b lang="en" dir="ltr">{it.en}</b>{it.own ? <span>{it.own}</span> : null}</div>
              ))}
            </div>
          </section>
        ))}
        <p className="small muted">{w.disc}</p>
      </main>
    </div>
  );
}
