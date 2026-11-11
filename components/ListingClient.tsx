"use client";
import { useEffect, useState } from "react";
import { T, type Lang } from "@/lib/i18n";
import { firstTime, readPlan, rememberOpened, rememberReport } from "@/lib/session";

type Props = { lang: Lang; fsa: string; listing: { id: string; clinic: string; area: string; phone: string | null } };

/** Remembers the clinic in this browser's plan, counts the open once, and sends "still open" or "full" reports. */
export default function ListingClient({ lang, fsa, listing }: Props) {
  const w = T[lang];
  const [state, setState] = useState<"idle" | "busy" | "open" | "full">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    rememberOpened(listing);
    const prior = readPlan().opened.find((o) => o.id === listing.id)?.report;
    if (prior) setState(prior);
    if (firstTime(`open|${listing.id}`))
      fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "open", fsa, lang }), keepalive: true }).catch(() => {});
  }, [listing, fsa, lang]);

  async function report(kind: "open" | "full") {
    setState("busy"); setError("");
    try {
      const res = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId: listing.id, kind, fsa, lang }) });
      if (res.status === 429) { setError(w.tooMany); setState("idle"); return; }
      if (!res.ok) throw new Error();
      rememberReport(listing.id, kind);
      setState(kind);
    } catch { setError(w.err); setState("idle"); }
  }

  return (
    <section className="card">
      <h3>{w.after}</h3>
      {state === "open" || state === "full" ? (
        <p className="ok" role="status">{state === "open" ? w.thOpen : w.thFull}</p>
      ) : (
        <div className="row">
          <button className="btn ghost" disabled={state === "busy"} onClick={() => report("open")}>{w.open}</button>
          <button className="btn bad" disabled={state === "busy"} onClick={() => report("full")}>{w.full}</button>
        </div>
      )}
      {error ? <p className="err" role="alert">{error}</p> : null}
    </section>
  );
}
