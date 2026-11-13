"use client";
import { useEffect, useState } from "react";
import { LANGS, T, type Lang } from "@/lib/i18n";
import { Steps } from "./bits";

export default function Start({ initial }: { initial: { lang: Lang; fsa: string; type: string } }) {
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [fsa, setFsa] = useState(initial.fsa);
  const [type, setType] = useState(initial.type);
  const w = T[lang];
  useEffect(() => { document.documentElement.lang = w.htmlLang; document.documentElement.dir = w.dir; }, [w]);

  return (
    <>
      <Steps n={1} />
      <form className="card" action="/results" method="get">
        <h1>{w.h}</h1>
        <p className="muted">{w.sub}</p>
        <div>
          <span className="lbl" id="l-lang">{w.lang}</span>
          <div className="chips" role="group" aria-labelledby="l-lang">
            {LANGS.map((k) => (
              <button type="button" key={k} lang={T[k].htmlLang} dir={T[k].dir} aria-pressed={lang === k} onClick={() => setLang(k)}>{T[k].name}</button>
            ))}
          </div>
          <input type="hidden" name="lang" value={lang} />
          <p className="small"><a href={`/guide?lang=${lang}`}>{w.xlLink}</a></p>
        </div>
        <div>
          <label className="lbl" htmlFor="postal">{w.postal}</label>
          <input type="text" id="postal" name="fsa" maxLength={3} autoComplete="off" required pattern="[KLMNPklmnp][0-9][ABCEGHJKLMNPRSTVWXYZabceghjklmnprstvwxyz]"
            dir="ltr" placeholder="M1P" value={fsa} onChange={(e) => setFsa(e.target.value.trim())} />
        </div>
        <div>
          <span className="lbl" id="l-type">{w.type}</span>
          <div className="chips" role="group" aria-labelledby="l-type">
            {(["any", "fd", "np"] as const).map((k) => (
              <button type="button" key={k} aria-pressed={type === k} onClick={() => setType(k)}>{w[k]}</button>
            ))}
          </div>
          <input type="hidden" name="type" value={type} />
        </div>
        <button className="btn" type="submit">{w.search}</button>
        <p className="small muted">{w.privacy}</p>
      </form>
      <p className="small muted">{w.disc}</p>
    </>
  );
}
