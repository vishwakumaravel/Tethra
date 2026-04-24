import { CoupleLocalDay } from './coupleDay';

export type DailyCheckInInput = {
  id?: string;
  userId: string;
  localDay: CoupleLocalDay;
};

export type DailyPredictionInput = {
  id?: string;
  predictorUserId: string;
  localDay: CoupleLocalDay;
};

export type DailyRevealInput = {
  id?: string;
  localDay: CoupleLocalDay;
  viewedByCurrentUser: boolean;
};

export type DailyStatus =
  | 'needs_check_in'
  | 'needs_prediction'
  | 'waiting_for_partner'
  | 'reveal_ready'
  | 'complete';

export function hasCompletedPairedDay({
  checkIns,
  predictions,
  partnerIds,
}: {
  checkIns: DailyCheckInInput[];
  predictions: DailyPredictionInput[];
  partnerIds: [string, string];
}) {
  const checkInUsers = new Set(checkIns.map((checkIn) => checkIn.userId));
  const predictionUsers = new Set(predictions.map((prediction) => prediction.predictorUserId));

  return partnerIds.every((userId) => checkInUsers.has(userId) && predictionUsers.has(userId));
}

export function getTodayStatus({
  currentUserId,
  checkIns,
  predictions,
  reveal,
}: {
  currentUserId: string;
  checkIns: DailyCheckInInput[];
  predictions: DailyPredictionInput[];
  reveal: DailyRevealInput | null;
}): DailyStatus {
  const hasCheckIn = checkIns.some((checkIn) => checkIn.userId === currentUserId);

  if (!hasCheckIn) {
    return 'needs_check_in';
  }

  const hasPrediction = predictions.some((prediction) => prediction.predictorUserId === currentUserId);

  if (!hasPrediction) {
    return 'needs_prediction';
  }

  if (!reveal) {
    return 'waiting_for_partner';
  }

  return reveal.viewedByCurrentUser ? 'complete' : 'reveal_ready';
}

export function assertUniqueDailyAction<T extends { localDay: CoupleLocalDay }>(
  records: T[],
  localDay: CoupleLocalDay,
) {
  return records.filter((record) => record.localDay === localDay).length <= 1;
}
