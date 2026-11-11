import Plan from "@/components/Plan";
import { parseSearch, searchQuery } from "@/lib/listings";

export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  return (
    <div className="wrap"><main className="stack"><Plan lang={s.lang} fsa={s.fsa} type={s.type} q={searchQuery(s)} /></main></div>
  );
}
