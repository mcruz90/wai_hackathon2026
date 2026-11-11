import Start from "@/components/Start";
import { parseSearch } from "@/lib/listings";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  return (
    <div className="wrap">
      <main className="stack"><Start initial={{ lang: s.lang, fsa: s.fsa, type: s.type }} /></main>
    </div>
  );
}
