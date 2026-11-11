import points from "../data/ontario-fsa.json";

/** 527 Ontario FSA representative points from GeoNames (CC BY 4.0). See data/SOURCES.md. */
export const FSA_TABLE: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(points).map(([fsa, value]) => [fsa, [value[0], value[1]] as [number, number]]),
);
export const FSA_CODES = Object.keys(FSA_TABLE);
export const isOntarioFsa = (fsa: string) => /^[KLMNP][0-9][ABCEGHJKLMNPRSTVWXYZ]$/.test(fsa);
export const DOWNTOWN: [number, number] = [43.653, -79.383];

export function cleanFsa(input: string | null | undefined): string {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

export function km(a: [number, number], b: [number, number]): number {
  const R = 6371, r = (x: number) => (x * Math.PI) / 180;
  const dl = r(b[0] - a[0]), dn = r(b[1] - a[1]);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
