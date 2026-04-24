import { CoupleLocalDay, isNextLocalDay } from './coupleDay';

export type StreakSnapshot = {
  currentStreak: number;
  longestStreak: number;
  lastPairedDay: CoupleLocalDay | null;
};

export function applyPairedDayToStreak(snapshot: StreakSnapshot, pairedDay: CoupleLocalDay): StreakSnapshot {
  if (snapshot.lastPairedDay === pairedDay) {
    return snapshot;
  }

  const continues = snapshot.lastPairedDay ? isNextLocalDay(snapshot.lastPairedDay, pairedDay) : false;
  const currentStreak = continues ? snapshot.currentStreak + 1 : 1;

  return {
    currentStreak,
    lastPairedDay: pairedDay,
    longestStreak: Math.max(snapshot.longestStreak, currentStreak),
  };
}
