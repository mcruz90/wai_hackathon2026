import { FreshLine, HtmlLang, SampleBanner, Steps } from "@/components/bits";
import ListingClient from "@/components/ListingClient";
import { prisma } from "@/lib/db";
import { backArrow, callScript, shortDate, T } from "@/lib/i18n";
import { liveWhere, originFor, parseSearch, searchQuery, toPublic } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const s = parseSearch(await searchParams);
  const w = T[s.lang], q = searchQuery(s);
  const row = await prisma.listing.findFirst({ where: { id, ...liveWhere() } });
  const back = <a className="btn link" href={s.fsa ? `/results?${q}` : `/?${q}`}>{backArrow(s.lang)} {w.back}</a>;
  if (!row) {
    return (
      <div className="wrap"><HtmlLang lang={s.lang} /><main className="stack">{back}<p className="note">{w.gone}</p>
        <a className="btn" href={`/plan?${q}`}>{w.toPlan}</a></main></div>
    );
  }
  const l = toPublic(row, (await originFor(s.fsa)).at, w.match);
  const type = l.providerType === "nurse_practitioner" ? w.np : w.fd;
  const safeUrl = l.sourceUrl && /^https?:\/\//i.test(l.sourceUrl) ? l.sourceUrl : null;
  return (
    <div className="wrap">
      <HtmlLang lang={s.lang} />
      <main className="stack">
        <Steps n={3} />
        {back}
        {l.isSample ? <SampleBanner lang={s.lang} /> : null}
        <section className="card">
          <div className="lhead">
            <div><div className="type">{type}</div><h1 style={{ fontSize: "1.3rem" }}>{l.clinic}</h1><div className="muted">{l.area}</div></div>
            <div className="stampbox">{shortDate(s.lang, l.confirmedAt)}</div>
          </div>
          <FreshLine l={l} lang={s.lang} />
          <div className="why">
            {l.languages.map((x) => <span key={x} className={`pill ${w.match.includes(x) && s.lang !== "en" ? "match" : ""}`}>{x}</span>)}
          </div>
          <p className="small muted">
            {w.source}: {safeUrl ? <a href={safeUrl} rel="noopener noreferrer nofollow" target="_blank">{w.src[l.sourceType] ?? w.src.rev}</a> : (w.src[l.sourceType] ?? w.src.rev)}
          </p>
        </section>
        <section className="card">
          <h2>{w.call}</h2>
          <p className="muted small">{w.hint}</p>
          <div className="script">
            {callScript(s.lang).map((line) => (
              <div className="say" key={line.en}><b lang="en" dir="ltr">{line.en}</b>{line.own ? <span>{line.own}</span> : null}</div>
            ))}
          </div>
          <div>
            <div className="small muted">{w.phone}</div>
            <div className="phone" dir="ltr">{l.phone ? <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>{l.phone}</a> : "—"}</div>
          </div>
        </section>
        <ListingClient lang={s.lang} fsa={s.fsa} listing={{ id: l.id, clinic: l.clinic, area: l.area, phone: l.phone }} />
        <a className="btn" href={`/plan?${q}`}>{w.toPlan}</a>
        <p className="small muted">{w.disc}</p>
      </main>
    </div>
  );
}
