"use client";
import { useEffect, useState } from "react";
import { T, type Lang } from "@/lib/i18n";
import type { PublicListing } from "@/lib/listings";
import { readPlan, type Opened } from "@/lib/session";
import { ListingCard, SampleBanner, Steps } from "./bits";

export default function Plan({ lang, fsa, type, q }: { lang: Lang; fsa: string; type: string; q: string }) {
  const w = T[lang];
  const [opened, setOpened] = useState<Opened[]>([]);
  const [next, setNext] = useState<PublicListing[] | null>(null);

  useEffect(() => {
    document.documentElement.lang = w.htmlLang;
    const mine = readPlan().opened;
    setOpened(mine);
    if (!fsa) { setNext([]); return; }
    // The request carries only the search (area, language, type). Which clinics this person opened stays here;
    // the filtering below happens in the browser.
    fetch(`/api/listings?${q}`).then((r) => r.json()).then((d: { listings: PublicListing[] }) => {
      const seen = new Set(mine.map((o) => o.id));
      setNext(d.listings.filter((l) => !seen.has(l.id)).slice(0, 3));
    }).catch(() => setNext([]));
  }, [fsa, q, w]);

  return (
    <>
      <Steps n={4} />
      <a className="btn link" href={fsa ? `/results?${q}` : `/?${q}`}>← {w.back}</a>
      <div><h1>{w.planH}</h1><p className="muted">{w.planSub}</p></div>

      <section className="card">
        <h2>{w.opened}</h2>
        {opened.length ? (
          <div>
            {opened.map((o) => (
              <div className="planrow" key={o.id}>
                <a href={`/listing/${o.id}?${q}`}><b>{o.clinic}</b></a>
                <span className="muted small">{o.area}{o.phone ? ` · ${o.phone}` : ""}</span>
                <span className={`state ${o.report === "open" ? "live" : o.report === "full" ? "full" : "gone"}`}>
                  {o.report === "open" ? w.repOpen : o.report === "full" ? w.repFull : w.repNone}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="muted">{w.noneOpened}</p>}
      </section>

      <section className="stack">
        <h2>{w.callNext}</h2>
        {!fsa ? <p className="note"><a href={`/?${q}`}>{w.needSearch}</a></p>
          : next === null ? <p className="muted small">…</p>
          : next.length ? <>{next.some((l) => l.isSample) ? <SampleBanner lang={lang} /> : null}{next.map((l) => <ListingCard key={l.id} l={l} lang={lang} href={`/listing/${l.id}?${q}`} />)}</>
          : <p className="note">{w.noMore}</p>}
      </section>

      <section className="card">
        <h2>{w.alsoDo}</h2>
        <h3>{w.hcc}</h3>
        <p className="small">{w.hccIf}</p>
        <p className="small muted">{w.what}</p>
        <ol className="plain">
          <li><b>{w.need}</b><div className="small muted">{w.noohip}</div></li>
          <li><a href="https://www.ontario.ca/healthcareconnect">{w.online}</a><div className="small muted">ontario.ca/healthcareconnect</div></li>
          <li>{w.callnum}</li>
        </ol>
      </section>

      <p><span className="tag">{w.concept}</span> <a href={`/waitlist/status?lang=${lang}&fsa=${fsa}&type=${type}`}>{w.wlLink}</a></p>
      <p className="small muted">{w.disc}</p>
    </>
  );
}
