/** Toronto forward sortation areas (first 3 postal characters) with rough centroids. Seeded into fsa_centroids. */
export const FSA_TABLE: Record<string, [number, number]> = {
  M1B: [43.807, -79.194], M1K: [43.728, -79.262], M1L: [43.711, -79.284], M1P: [43.757, -79.273], M1T: [43.781, -79.304],
  M2J: [43.778, -79.347], M2N: [43.77, -79.413], M3H: [43.754, -79.443], M3J: [43.767, -79.487], M3N: [43.761, -79.521],
  M4C: [43.69, -79.31], M4H: [43.705, -79.349], M4K: [43.68, -79.352], M4L: [43.669, -79.316], M4Y: [43.666, -79.383],
  M5A: [43.654, -79.361], M5T: [43.653, -79.4], M5V: [43.643, -79.394], M6H: [43.669, -79.442], M6K: [43.637, -79.428],
  M6M: [43.691, -79.476], M6P: [43.661, -79.464], M8V: [43.606, -79.501], M9V: [43.74, -79.588], M9W: [43.706, -79.594],
};
export const FSA_CODES = Object.keys(FSA_TABLE);
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
