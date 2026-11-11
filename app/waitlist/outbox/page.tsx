import WaitlistShell from "@/components/WaitlistShell";
import { prisma } from "@/lib/db";
import { asLang, EN_NAME, T } from "@/lib/i18n";
import { parseSearch, searchQuery } from "@/lib/listings";

export const dynamic = "force-dynamic";
const KIND: Record<string, string> = { offer: "Offer", reminder: "Reminder", checkin: "30-day check-in" };
const when = (d: Date) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(d);

export default async function Outbox({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  const messages = await prisma.outboxMessage.findMany({ include: { entry: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
  return (
    <WaitlistShell lang={s.lang} back={`/waitlist/status?${searchQuery(s)}`}>
      <section className="card">
        <h1>{T[s.lang].wlOutboxLink}</h1>
        <p className="small muted" lang="en">Each message as it would be sent, in the sample entry's language. Nothing here leaves this page.</p>
        {messages.length ? messages.map((m) => (
          <div className="msg" key={m.id}>
            <span className="small muted" lang="en">{KIND[m.kind] ?? m.kind} · {m.entry.label} · {m.entry.channel === "sms" ? "text message" : "email"} · {EN_NAME[asLang(m.entry.language)]} · {when(m.createdAt)}</span>
            <span lang={T[asLang(m.entry.language)].htmlLang}>{m.body}</span>
          </div>
        )) : <p className="muted" lang="en">No messages yet.</p>}
      </section>
    </WaitlistShell>
  );
}
