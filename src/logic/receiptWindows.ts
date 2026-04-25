import { addLocalDays, compareLocalDays, getDaysBetween } from './coupleDay';

export type ReceiptWindow = {
  periodEndLocal: string;
  periodStartLocal: string;
};

export function getMondayWeekStart(localDay: string) {
  const date = parseLocalDay(localDay);
  const isoDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  return addLocalDays(localDay, -(isoDay - 1));
}

export function getReceiptWeekWindow(periodStartLocal: string): ReceiptWindow {
  return {
    periodEndLocal: addLocalDays(periodStartLocal, 6),
    periodStartLocal,
  };
}

export function getPreviousClosedReceiptWindow(currentLocalDay: string): ReceiptWindow {
  return getReceiptWeekWindow(addLocalDays(getMondayWeekStart(currentLocalDay), -7));
}

export function isReceiptWindowClosed(window: ReceiptWindow, currentLocalDay: string) {
  return compareLocalDays(window.periodEndLocal, currentLocalDay) < 0;
}

export function getReceiptGenerationKey({
  coupleId,
  generationVersion,
  periodStartLocal,
}: {
  coupleId: string;
  generationVersion: number;
  periodStartLocal: string;
}) {
  return `${coupleId}:${periodStartLocal}:v${generationVersion}`;
}

export function countDaysInWindow(window: ReceiptWindow) {
  return getDaysBetween(window.periodStartLocal, window.periodEndLocal) + 1;
}

function parseLocalDay(localDay: string) {
  const [year, month, day] = localDay.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
