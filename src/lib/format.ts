/** Display formatting that must respect a zone other than the server's. */

/** "Sun, Oct 25, 8:00 PM" in `timeZone`. */
export function formatDateTime(instant: Date, timeZone: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

/** "8:00 PM" in `timeZone`. */
export function formatTime(instant: Date, timeZone: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(
    instant,
  );
}
