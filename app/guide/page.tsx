import { redirect } from "next/navigation";
import { HtmlLang } from "@/components/bits";
import ClinicSays from "@/components/ClinicSays";
import Speak from "@/components/Speak";
import { backArrow, EN_NAME, englishCallLines, fill, GUIDE, guide, LANGS, MT_NAME, speechLangFor, T } from "@/lib/i18n";
import { parseSearch, searchQuery } from "@/lib/listings";
import { cleanLanguage, translateLines } from "@/lib/translate";

export const dynamic = "force-dynamic";

type Item = { en: string; own: string };
type Group = { title: string; items: Item[] };

/**
 * Questions for an appointment, in the patient's language. A fixed, curated list written in advance:
 * no chat. Practical questions only, not medical advice. Each English line can be read aloud.
 *
 * ?xl=<language> asks for a language the app has no reviewed translation for: the phone script and the
 * questions are machine-translated (lib/translate.ts) and labelled as such. The English never changes.
 *
 * For a patient who does not speak English, a panel lets clinic staff type an instruction in English
 * (or tap an example) and shows it machine-translated into the patient's language (components/ClinicSays.tsx).
 */
export default async function GuidePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s = parseSearch(sp);
  const w = T[s.lang], q = searchQuery(s);
  const raw = Array.isArray(sp.xl) ? sp.xl[0] : sp.xl;
  const xl = cleanLanguage(raw);

  // A language with reviewed translations goes to those instead of machine translation.
  const reviewed = xl ? LANGS.find((l) => EN_NAME[l].toLowerCase() === xl.toLowerCase() || T[l].name.toLowerCase() === xl.toLowerCase()) : undefined;
  if (reviewed) redirect(`/guide?${searchQuery({ ...s, lang: reviewed })}`);

  // The language clinic instructions are translated into. None for an English speaker.
  const target = xl ?? (s.lang === "en" ? null : MT_NAME[s.lang]);

  let groups: Group[] = guide(s.lang);
  let failed = false;
  if (xl) {
    const call = englishCallLines(xl).filter((l): l is string => !!l);
    const questions = GUIDE.flat();
    try {
      const own = await translateLines(xl, [...call, ...questions]);
      let i = call.length;
      groups = [
        { title: w.call, items: call.map((en, k) => ({ en, own: own[k] })) },
        ...guide(s.lang).map((g) => ({ title: g.title, items: g.items.map((it) => ({ en: it.en, own: own[i++] })) })),
      ];
    } catch (e) {
      console.error("translation failed:", e instanceof Error ? e.message : e);
      failed = true;
      groups = [{ title: w.call, items: call.map((en) => ({ en, own: "" })) }, ...guide(s.lang).map((g) => ({ ...g, items: g.items.map((it) => ({ en: it.en, own: "" })) }))];
    }
  }

  return (
    <div className="wrap">
      <HtmlLang lang={s.lang} />
      <main className="stack">
        <a className="btn link" href={`/plan?${q}`}>{backArrow(s.lang)} {w.toPlan}</a>
        <div><h1>{w.guideH}</h1><p className="muted">{w.guideSub}</p></div>
        {xl && !failed ? <p className="note" role="note">{fill(w.xlNote, { lang: xl })}</p> : null}
        {failed ? <p className="note" role="alert">{w.xlFail}</p> : null}
        {groups.map((g) => (
          <section className="card guide-group" key={g.title}>
            <h2>{g.title}</h2>
            <div className="script">
              {g.items.map((it) => (
                <div className="say" key={it.en}>
                  <b lang="en" dir="ltr">{it.en}</b>
                  {it.own ? <span lang={xl ? undefined : T[s.lang].htmlLang} dir="auto">{it.own}</span> : null}
                  <Speak text={it.en} label={w.speak} />
                </div>
              ))}
            </div>
          </section>
        ))}
        {target ? <ClinicSays language={target} speechLang={speechLangFor(target)} dir={w.dir} w={w} /> : null}
        <form className="card stack" action="/guide" method="get">
          <label className="lbl" htmlFor="xl">{w.xlLabel}</label>
          <input type="text" id="xl" name="xl" maxLength={40} defaultValue={xl ?? ""} placeholder={w.xlPlaceholder} autoComplete="off" />
          <input type="hidden" name="lang" value={s.lang} />
          <input type="hidden" name="fsa" value={s.fsa} />
          <input type="hidden" name="type" value={s.type} />
          <button className="btn ghost" type="submit">{w.xlButton}</button>
        </form>
        <p className="small muted">{w.disc}</p>
      </main>
    </div>
  );
}
