import { confirmedText, expiresText, fill, shortDate, T, type Lang } from "@/lib/i18n";
import type { PublicListing } from "@/lib/listings";
import { config } from "@/lib/config";

export function Steps({ n }: { n: number }) {
  return (
    <div className="steps" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}
    </div>
  );
}

export function Meter({ fr }: { fr: number }) {
  return (
    <div className={`meter ${fr <= 0 ? "stale" : fr < 0.35 ? "aging" : ""}`}>
      <i style={{ width: `${Math.round(fr * 100)}%` }} />
    </div>
  );
}

export function SampleBanner({ lang }: { lang: Lang }) {
  return <div className="banner">{T[lang].sample}</div>;
}

export function FreshLine({ l, lang }: { l: PublicListing; lang: Lang }) {
  return (
    <>
      <Meter fr={l.fr} />
      <div className="fresh-line">
        <span>{confirmedText(lang, l.age)}</span>
        <span>{expiresText(lang, l.daysLeft)}</span>
      </div>
    </>
  );
}

export function ListingCard({ l, lang, href }: { l: PublicListing; lang: Lang; href: string }) {
  const w = T[lang];
  const type = l.providerType === "nurse_practitioner" ? w.np : w.fd;
  return (
    <a className="listing" href={href}>
      <div className="lhead">
        <div>
          <div className="type">{type}</div>
          <h3>{l.clinic}</h3>
          <div className="muted small">{l.area}</div>
        </div>
        <div className="stampbox">{shortDate(lang, l.confirmedAt)}</div>
      </div>
      <div className="why">
        {l.lm && lang !== "en" ? <span className="pill match">{fill(w.speaks, { lang: w.own })}</span> : null}
        {l.d === null ? null : <span className="pill">{fill(w.km, { n: l.d.toFixed(1) })}</span>}
        <span className="pill">{w.source}: {w.src[l.sourceType] ?? w.src.rev}</span>
      </div>
      <FreshLine l={l} lang={lang} />
    </a>
  );
}

export function HtmlLang({ lang }: { lang: Lang }) {
  // Sets <html lang> and <html dir> (Arabic is right to left) for screen readers without making the root layout depend on the query string.
  return <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(T[lang].htmlLang)};document.documentElement.dir=${JSON.stringify(T[lang].dir)}` }} />;
}

export const expiryDays = () => config.expiryDays;
