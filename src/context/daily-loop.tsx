import * as React from 'react';

import { useAuth } from '@/context/auth';
import { useRelationship } from '@/context/relationship';
import { getCoupleLocalDay } from '@/logic/coupleDay';
import { getTodayStatus } from '@/logic/dailyLoop';
import { supabase } from '@/lib/supabase';
import {
  DailyCheckIn,
  DailyLoopErrorCode,
  DailyPrediction,
  DailyReveal,
  DailyStatus,
} from '@/types/database';
import { DailyCheckInFormValues, DailyPredictionFormValues } from '@/validation/forms';

type DailyLoopActionResult = {
  ok: boolean;
  code?: DailyLoopErrorCode;
  message?: string;
};

type TodayReveal = DailyReveal & {
  viewedByCurrentUser: boolean;
};

type DailyLoopContextValue = {
  currentUserCheckIn: DailyCheckIn | null;
  currentUserPrediction: DailyPrediction | null;
  error: string | null;
  isLoading: boolean;
  localDay: string | null;
  markRevealViewed: () => Promise<DailyLoopActionResult>;
  partnerCheckIn: DailyCheckIn | null;
  partnerPrediction: DailyPrediction | null;
  refreshToday: () => Promise<void>;
  saveCheckIn: (values: DailyCheckInFormValues) => Promise<DailyLoopActionResult>;
  savePrediction: (values: DailyPredictionFormValues) => Promise<DailyLoopActionResult>;
  streak: {
    current: number;
    longest: number;
  };
  todayCheckIns: DailyCheckIn[];
  todayPredictions: DailyPrediction[];
  todayReveal: TodayReveal | null;
  todayStatus: DailyStatus;
};

type DailyLoopRpcResult = {
  current_streak: number;
  error_code: DailyLoopErrorCode | null;
  error_message: string | null;
  longest_streak: number;
  ok: boolean;
  reveal_created: boolean;
  submitted_local_day: string;
};

type MarkRevealRpcResult = {
  error_code: DailyLoopErrorCode | null;
  error_message: string | null;
  ok: boolean;
};

const DailyLoopContext = React.createContext<DailyLoopContextValue | null>(null);

export function DailyLoopProvider({ children }: { children: React.ReactNode }) {
  const { hasCompletedProfile, session } = useAuth();
  const { couple, partnerProfile, relationshipState, refreshRelationship } = useRelationship();
  const [todayCheckIns, setTodayCheckIns] = React.useState<DailyCheckIn[]>([]);
  const [todayPredictions, setTodayPredictions] = React.useState<DailyPrediction[]>([]);
  const [todayReveal, setTodayReveal] = React.useState<TodayReveal | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const localDay = React.useMemo(() => {
    if (!couple || relationshipState !== 'linked') {
      return null;
    }

    return getCoupleLocalDay(new Date(), couple.timezone);
  }, [couple, relationshipState]);

  const currentUserId = session?.user.id ?? null;
  const currentUserCheckIn = currentUserId ? todayCheckIns.find((checkIn) => checkIn.user_id === currentUserId) ?? null : null;
  const partnerCheckIn = partnerProfile ? todayCheckIns.find((checkIn) => checkIn.user_id === partnerProfile.id) ?? null : null;
  const currentUserPrediction = currentUserId
    ? todayPredictions.find((prediction) => prediction.predictor_user_id === currentUserId) ?? null
    : null;
  const partnerPrediction = partnerProfile
    ? todayPredictions.find((prediction) => prediction.predictor_user_id === partnerProfile.id) ?? null
    : null;

  const todayStatus = currentUserId
    ? getTodayStatus({
        checkIns: todayCheckIns.map((checkIn) => ({ localDay: checkIn.local_day, userId: checkIn.user_id })),
        currentUserId,
        predictions: todayPredictions.map((prediction) => ({
          localDay: prediction.local_day,
          predictorUserId: prediction.predictor_user_id,
        })),
        reveal: todayReveal ? { id: todayReveal.id, localDay: todayReveal.local_day, viewedByCurrentUser: todayReveal.viewedByCurrentUser } : null,
      })
    : 'needs_check_in';

  const refreshToday = React.useCallback(async () => {
    if (!currentUserId || !couple || !localDay || relationshipState !== 'linked' || !hasCompletedProfile) {
      setTodayCheckIns([]);
      setTodayPredictions([]);
      setTodayReveal(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [checkInsResult, predictionsResult, revealsResult] = await Promise.all([
      supabase.from('daily_check_ins').select('*').eq('couple_id', couple.id).eq('local_day', localDay),
      supabase.from('daily_predictions').select('*').eq('couple_id', couple.id).eq('local_day', localDay),
      supabase.from('daily_reveals').select('*').eq('couple_id', couple.id).eq('local_day', localDay).maybeSingle(),
    ]);

    if (checkInsResult.error || predictionsResult.error || revealsResult.error) {
      setError(checkInsResult.error?.message ?? predictionsResult.error?.message ?? revealsResult.error?.message ?? 'Could not load today.');
      setIsLoading(false);
      return;
    }

    setTodayCheckIns(checkInsResult.data ?? []);
    setTodayPredictions(predictionsResult.data ?? []);
    setTodayReveal(toTodayReveal(revealsResult.data, currentUserId, couple.user_1_id, couple.user_2_id));
    setIsLoading(false);
  }, [couple, currentUserId, hasCompletedProfile, localDay, relationshipState]);

  React.useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  const saveCheckIn = async (values: DailyCheckInFormValues): Promise<DailyLoopActionResult> => {
    if (!localDay) {
      return { ok: false, message: 'Link with your partner before checking in.' };
    }

    const { data, error: rpcError } = await supabase.rpc('submit_daily_check_in', {
      local_day: localDay,
      mood_score: values.moodScore,
      optional_text: values.optionalText?.trim() ? values.optionalText.trim() : null,
      relationship_feeling_score: values.relationshipFeelingScore,
      stress_level: values.stressLevel,
    });

    const result = getRpcRow<DailyLoopRpcResult>(data);

    if (rpcError || !result) {
      return { ok: false, message: 'We could not save your check-in right now.' };
    }

    await refreshRelationship();
    await refreshToday();

    if (!result.ok && result.error_code) {
      return { ok: false, code: result.error_code, message: result.error_message ?? dailyLoopErrorMessage(result.error_code) };
    }

    return { ok: true, message: result.reveal_created ? 'Reveal unlocked.' : 'Check-in saved.' };
  };

  const savePrediction = async (values: DailyPredictionFormValues): Promise<DailyLoopActionResult> => {
    if (!localDay) {
      return { ok: false, message: 'Link with your partner before predicting.' };
    }

    const { data, error: rpcError } = await supabase.rpc('submit_daily_prediction', {
      local_day: localDay,
      predicted_mood_score: values.predictedMoodScore,
      predicted_relationship_feeling_score: values.predictedRelationshipFeelingScore,
    });

    const result = getRpcRow<DailyLoopRpcResult>(data);

    if (rpcError || !result) {
      return { ok: false, message: 'We could not save your prediction right now.' };
    }

    await refreshRelationship();
    await refreshToday();

    if (!result.ok && result.error_code) {
      return { ok: false, code: result.error_code, message: result.error_message ?? dailyLoopErrorMessage(result.error_code) };
    }

    return { ok: true, message: result.reveal_created ? 'Reveal unlocked.' : 'Prediction saved.' };
  };

  const markRevealViewed = async (): Promise<DailyLoopActionResult> => {
    if (!localDay || !todayReveal) {
      return { ok: false, message: 'The reveal is not ready yet.' };
    }

    const { data, error: rpcError } = await supabase.rpc('mark_daily_reveal_viewed', {
      local_day: localDay,
    });

    const result = getRpcRow<MarkRevealRpcResult>(data);

    if (rpcError || !result) {
      return { ok: false, message: 'We could not update the reveal right now.' };
    }

    await refreshToday();

    if (!result.ok && result.error_code) {
      return { ok: false, code: result.error_code, message: result.error_message ?? dailyLoopErrorMessage(result.error_code) };
    }

    return { ok: true };
  };

  const value = React.useMemo<DailyLoopContextValue>(
    () => ({
      currentUserCheckIn,
      currentUserPrediction,
      error,
      isLoading,
      localDay,
      markRevealViewed,
      partnerCheckIn,
      partnerPrediction,
      refreshToday,
      saveCheckIn,
      savePrediction,
      streak: {
        current: couple?.current_streak ?? 0,
        longest: couple?.longest_streak ?? 0,
      },
      todayCheckIns,
      todayPredictions,
      todayReveal,
      todayStatus,
    }),
    [
      couple?.current_streak,
      couple?.longest_streak,
      currentUserCheckIn,
      currentUserPrediction,
      error,
      isLoading,
      localDay,
      partnerCheckIn,
      partnerPrediction,
      todayCheckIns,
      todayPredictions,
      todayReveal,
      todayStatus,
    ],
  );

  return <DailyLoopContext.Provider value={value}>{children}</DailyLoopContext.Provider>;
}

export function useDailyLoop() {
  const context = React.useContext(DailyLoopContext);

  if (!context) {
    throw new Error('useDailyLoop must be used inside DailyLoopProvider');
  }

  return context;
}

function toTodayReveal(
  reveal: DailyReveal | null,
  currentUserId: string,
  user1Id: string | null,
  user2Id: string | null,
): TodayReveal | null {
  if (!reveal) {
    return null;
  }

  const viewedByCurrentUser =
    (currentUserId === user1Id && Boolean(reveal.user_1_viewed_at)) ||
    (currentUserId === user2Id && Boolean(reveal.user_2_viewed_at));

  return {
    ...reveal,
    viewedByCurrentUser,
  };
}

function getRpcRow<T>(data: T[] | null) {
  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

function dailyLoopErrorMessage(code: DailyLoopErrorCode) {
  switch (code) {
    case 'duplicate_check_in':
      return 'You already checked in today.';
    case 'duplicate_prediction':
      return 'You already predicted today.';
    case 'invalid_scores':
      return 'Scores must be between 1 and 5.';
    case 'invalid_text':
      return 'Keep the check-in note shorter.';
    case 'not_linked':
      return 'Link with your partner first.';
    case 'reveal_missing':
      return 'The reveal is not ready yet.';
    default:
      return 'We hit an unexpected daily loop error.';
  }
}
