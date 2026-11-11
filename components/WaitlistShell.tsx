import { HtmlLang } from "./bits";
import { T, type Lang } from "@/lib/i18n";

export default function WaitlistShell({ lang, back, children }: { lang: Lang; back: string; children: React.ReactNode }) {
  const w = T[lang];
  return (
    <div className="wrap">
      <HtmlLang lang={lang} />
      <main className="stack">
        <a className="btn link" href={back}>← {w.back}</a>
        <div className="banner">{w.wlBanner}</div>
        <p className="note">{w.wlNot}</p>
        {children}
      </main>
    </div>
  );
}
