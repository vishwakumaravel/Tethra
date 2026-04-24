export type CoupleLocalDay = string;

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

export function getCoupleLocalDay(instant: Date, timezone: string): CoupleLocalDay {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    ...DATE_PARTS,
    timeZone: normalizeTimezone(timezone),
  });

  const parts = formatter.formatToParts(instant);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return instant.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function addLocalDays(localDay: CoupleLocalDay, days: number): CoupleLocalDay {
  const date = parseLocalDay(localDay);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function compareLocalDays(left: CoupleLocalDay, right: CoupleLocalDay) {
  return parseLocalDay(left).getTime() - parseLocalDay(right).getTime();
}

export function getDaysBetween(start: CoupleLocalDay, end: CoupleLocalDay) {
  const milliseconds = parseLocalDay(end).getTime() - parseLocalDay(start).getTime();
  return Math.round(milliseconds / 86_400_000);
}

export function isNextLocalDay(previous: CoupleLocalDay, next: CoupleLocalDay) {
  return getDaysBetween(previous, next) === 1;
}

export function normalizeTimezone(timezone: string | null | undefined) {
  if (!timezone) {
    return 'UTC';
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return 'UTC';
  }
}

function parseLocalDay(localDay: CoupleLocalDay) {
  const [year, month, day] = localDay.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
