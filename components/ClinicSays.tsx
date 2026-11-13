"use client";
import { useState } from "react";
import Speak from "@/components/Speak";
import { CLINIC_PRESETS } from "@/lib/i18n";

type Words = { clinicH: string; clinicNote: string; clinicOwn: string; clinicSpeak: string; clinicFail: string; clinicNums: string };
type Result = { en: string; own: string; numbersOk: boolean };

/**
 * The other direction of the guide: clinic staff type an instruction in English (or pick an example),
 * and the patient reads it in their own language, and hears it where the device has a voice for it.
 * The staff-facing parts are in English; the patient-facing parts are in the patient's language.
 */
export default function ClinicSays({ language, speechLang, dir, w }: { language: string; speechLang: string | null; dir: "ltr" | "rtl"; w: Words }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function translate(en: string) {
    const clean = en.trim();
    if (!clean || busy) return;
    setBusy(true); setFailed(false); setResult(null);
    try {
      const res = await fetch("/api/clinic-say", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ language, text: clean }) });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error();
      setResult({ en: clean, own: body.text, numbersOk: body.numbersOk });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack clinic-says">
      <h2 dir={dir}>{w.clinicH}</h2>
      <p className="note" role="note" dir={dir}>{w.clinicNote}</p>

      <div className="stack" lang="en" dir="ltr">
        <label className="lbl" htmlFor="clinic-text">For clinic staff: type an instruction in English, or tap an example.</label>
        <div className="presets">
          {CLINIC_PRESETS.map((p) => (
            <button key={p} type="button" className="btn ghost preset" disabled={busy} onClick={() => { setText(p); translate(p); }}>{p}</button>
          ))}
        </div>
        <textarea id="clinic-text" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: Take this medicine every 8 hours." />
        <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => translate(text)}>
          {busy ? "Translating…" : `Translate into ${language}`}
        </button>
      </div>

      <div aria-live="polite">
        {failed ? <p className="note" role="alert" dir={dir}>{w.clinicFail}</p> : null}
        {result ? (
          <div className="say">
            <b lang="en" dir="ltr">{result.en}</b>
            <span className="small muted" dir={dir}>{w.clinicOwn}</span>
            <span className="clinic-own" lang={speechLang ?? undefined} dir="auto">{result.own}</span>
            {!result.numbersOk ? <p className="note" role="alert" dir={dir}>{w.clinicNums}</p> : null}
            {speechLang ? <Speak text={result.own} label={w.clinicSpeak} lang={speechLang} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
