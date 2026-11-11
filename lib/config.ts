const num = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const config = {
  get searchRadiusKm() { return num("SEARCH_RADIUS_KM", 75); },
  get expiryDays() { return num("EXPIRY_DAYS", 30); },
  get waitlistRadiusKm() { return num("WAITLIST_RADIUS_KM", 8); },
  get offerBatchSize() { return Math.round(num("OFFER_BATCH_SIZE", 3)); },
  get offerWindowHours() { return num("OFFER_WINDOW_HOURS", 72); },
};

export const DAY_MS = 864e5;
/** Distance at which the distance score reaches zero. Also the "nearby" radius for the no-language-match counter. */
export const NEARBY_KM = 15;
/** A listing is hidden after this many separate full reports. */
export const FULL_REPORTS_TO_HIDE = 2;
/** Partner view hides any count under this. */
export const SMALL_CELL = 5;
